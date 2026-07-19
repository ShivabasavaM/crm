import json
from datetime import datetime, date
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select
import razorpay

from config import settings, PIPELINE_STAGES
from database import init_db, get_session, engine
from models import User, Contact, Deal, Activity, AiDraft
from auth import hash_password, verify_password, create_token, get_current_user
from ai import generate_follow_up

rzp = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
CLOSED_STAGES = ("Won", "Lost")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_origins=[settings.FRONTEND_URL.rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- Schemas ----------------
class AuthIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ContactIn(BaseModel):
    name: str
    email: str | None = None
    company: str | None = None
    phone: str | None = None
    notes: str | None = ""


class DealIn(BaseModel):
    title: str
    contact_id: int | None = None
    value: float = 0.0
    stage: str = "Lead"
    notes: str | None = ""
    priority: str | None = "Medium"
    expected_close_date: date | None = None
    next_action: str | None = None
    next_action_date: date | None = None


class DealUpdate(BaseModel):
    title: str | None = None
    contact_id: int | None = None
    value: float | None = None
    stage: str | None = None
    notes: str | None = None
    priority: str | None = None
    expected_close_date: date | None = None
    next_action: str | None = None
    next_action_date: date | None = None


class FollowUpIn(BaseModel):
    deal_id: int
    instructions: str | None = None


class ActivityIn(BaseModel):
    type: str = "note"
    note: str = ""
    occurred_at: datetime | None = None


class VerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ---------------- Auth ----------------
@app.post("/auth/signup", response_model=TokenOut)
def signup(body: AuthIn, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.email == body.email)).first():
        raise HTTPException(400, "Email already registered")
    user = User(email=body.email, hashed_password=hash_password(body.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return TokenOut(access_token=create_token(user.id))


@app.post("/auth/login", response_model=TokenOut)
def login(body: AuthIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    return TokenOut(access_token=create_token(user.id))


# ---------------- Usage / account ----------------
def contact_count(session: Session, user_id: int) -> int:
    return len(session.exec(select(Contact).where(Contact.user_id == user_id)).all())


def ai_used_today(session: Session, user_id: int) -> int:
    start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return len(
        session.exec(
            select(AiDraft).where(
                AiDraft.user_id == user_id, AiDraft.created_at >= start
            )
        ).all()
    )


@app.get("/account")
def account(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    return {
        "id": user.id,
        "email": user.email,
        "plan": user.plan,
        "contact_count": contact_count(session, user.id),
        "contact_limit": None if user.plan == "pro" else settings.FREE_CONTACT_LIMIT,
        "ai_used_today": ai_used_today(session, user.id),
        "ai_daily_limit": None if user.plan == "pro" else settings.FREE_AI_DAILY_LIMIT,
        "stages": PIPELINE_STAGES,
    }


# ---------------- Contacts ----------------
@app.get("/contacts")
def list_contacts(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    return session.exec(
        select(Contact).where(Contact.user_id == user.id).order_by(Contact.created_at.desc())
    ).all()


@app.post("/contacts")
def create_contact(
    body: ContactIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if user.plan == "free" and contact_count(session, user.id) >= settings.FREE_CONTACT_LIMIT:
        raise HTTPException(
            402,
            f"Free plan is capped at {settings.FREE_CONTACT_LIMIT} contacts. Upgrade to Pro for unlimited.",
        )
    contact = Contact(user_id=user.id, **body.model_dump())
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@app.patch("/contacts/{contact_id}")
def update_contact(
    contact_id: int,
    body: ContactIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    contact = session.get(Contact, contact_id)
    if not contact or contact.user_id != user.id:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(contact, k, v)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@app.delete("/contacts/{contact_id}")
def delete_contact(
    contact_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    contact = session.get(Contact, contact_id)
    if not contact or contact.user_id != user.id:
        raise HTTPException(404, "Not found")
    session.delete(contact)
    session.commit()
    return {"ok": True}


# ---------------- Deals (pipeline) ----------------
@app.get("/deals")
def list_deals(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    return session.exec(
        select(Deal).where(Deal.user_id == user.id).order_by(Deal.created_at.desc())
    ).all()


@app.post("/deals")
def create_deal(
    body: DealIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if body.stage not in PIPELINE_STAGES:
        raise HTTPException(400, f"Stage must be one of {PIPELINE_STAGES}")
    deal = Deal(user_id=user.id, **body.model_dump())
    if deal.stage in CLOSED_STAGES:
        deal.closed_at = datetime.utcnow()
    session.add(deal)
    session.commit()
    session.refresh(deal)
    return deal


@app.patch("/deals/{deal_id}")
def update_deal(
    deal_id: int,
    body: DealUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deal = session.get(Deal, deal_id)
    if not deal or deal.user_id != user.id:
        raise HTTPException(404, "Not found")

    data = body.model_dump(exclude_unset=True)
    if "stage" in data and data["stage"] not in PIPELINE_STAGES:
        raise HTTPException(400, f"Stage must be one of {PIPELINE_STAGES}")

    old_stage = deal.stage
    for k, v in data.items():
        setattr(deal, k, v)
    deal.updated_at = datetime.utcnow()

    # Stage transition: log it and manage closed_at.
    if "stage" in data and data["stage"] != old_stage:
        new_stage = data["stage"]
        if new_stage in CLOSED_STAGES:
            deal.closed_at = datetime.utcnow()
        else:
            deal.closed_at = None
        session.add(
            Activity(
                user_id=user.id,
                deal_id=deal.id,
                type="stage_change",
                note=f"{old_stage} \u2192 {new_stage}",
            )
        )

    session.add(deal)
    session.commit()
    session.refresh(deal)
    return deal


@app.delete("/deals/{deal_id}")
def delete_deal(
    deal_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deal = session.get(Deal, deal_id)
    if not deal or deal.user_id != user.id:
        raise HTTPException(404, "Not found")
    # remove this deal's activities too
    for a in session.exec(select(Activity).where(Activity.deal_id == deal.id)).all():
        session.delete(a)
    session.delete(deal)
    session.commit()
    return {"ok": True}


# ---------------- Activities (deal timeline) ----------------
@app.get("/deals/{deal_id}/activities")
def list_activities(
    deal_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deal = session.get(Deal, deal_id)
    if not deal or deal.user_id != user.id:
        raise HTTPException(404, "Deal not found")
    return session.exec(
        select(Activity)
        .where(Activity.deal_id == deal_id)
        .order_by(Activity.occurred_at.desc())
    ).all()


@app.post("/deals/{deal_id}/activities")
def add_activity(
    deal_id: int,
    body: ActivityIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    deal = session.get(Deal, deal_id)
    if not deal or deal.user_id != user.id:
        raise HTTPException(404, "Deal not found")
    act = Activity(
        user_id=user.id,
        deal_id=deal_id,
        type=body.type or "note",
        note=body.note or "",
        occurred_at=body.occurred_at or datetime.utcnow(),
    )
    session.add(act)
    session.commit()
    session.refresh(act)
    return act


# ---------------- Dashboard analytics ----------------
@app.get("/dashboard")
def dashboard(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    deals = session.exec(select(Deal).where(Deal.user_id == user.id)).all()
    today = date.today()

    won = [d for d in deals if d.stage == "Won"]
    lost = [d for d in deals if d.stage == "Lost"]
    open_deals = [d for d in deals if d.stage not in CLOSED_STAGES]

    closed = len(won) + len(lost)
    win_rate = round(len(won) / closed, 3) if closed else None

    won_value_total = sum(d.value or 0 for d in won)
    won_this_month = sum(
        (d.value or 0)
        for d in won
        if d.closed_at and d.closed_at.year == today.year and d.closed_at.month == today.month
    )
    open_value = sum(d.value or 0 for d in open_deals)
    avg_deal_size = round(won_value_total / len(won), 2) if won else 0

    funnel = [
        {
            "stage": s,
            "count": len([d for d in deals if d.stage == s]),
            "value": sum(d.value or 0 for d in deals if d.stage == s),
        }
        for s in PIPELINE_STAGES
    ]

    closing_this_month = [
        {
            "id": d.id,
            "title": d.title,
            "value": d.value,
            "expected_close_date": d.expected_close_date.isoformat()
            if d.expected_close_date
            else None,
        }
        for d in open_deals
        if d.expected_close_date
        and d.expected_close_date.year == today.year
        and d.expected_close_date.month == today.month
    ]

    overdue_actions = [
        {
            "id": d.id,
            "title": d.title,
            "next_action": d.next_action,
            "next_action_date": d.next_action_date.isoformat()
            if d.next_action_date
            else None,
        }
        for d in open_deals
        if d.next_action_date and d.next_action_date < today
    ]

    recent = session.exec(
        select(Activity)
        .where(Activity.user_id == user.id)
        .order_by(Activity.occurred_at.desc())
    ).all()[:8]
    recent_activities = [
        {
            "id": a.id,
            "deal_id": a.deal_id,
            "type": a.type,
            "note": a.note,
            "occurred_at": a.occurred_at.isoformat(),
        }
        for a in recent
    ]

    return {
        "win_rate": win_rate,
        "counts": {
            "won": len(won),
            "lost": len(lost),
            "open": len(open_deals),
            "total": len(deals),
        },
        "open_pipeline_value": open_value,
        "won_value_total": won_value_total,
        "won_value_this_month": won_this_month,
        "avg_deal_size": avg_deal_size,
        "funnel": funnel,
        "closing_this_month": closing_this_month,
        "overdue_actions": overdue_actions,
        "recent_activities": recent_activities,
    }


# ---------------- AI feature (gated) ----------------
@app.post("/ai/follow-up")
def ai_follow_up(
    body: FollowUpIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if user.plan == "free" and ai_used_today(session, user.id) >= settings.FREE_AI_DAILY_LIMIT:
        raise HTTPException(
            402,
            f"Free plan allows {settings.FREE_AI_DAILY_LIMIT} AI drafts/day. Upgrade to Pro for unlimited.",
        )

    deal = session.get(Deal, body.deal_id)
    if not deal or deal.user_id != user.id:
        raise HTTPException(404, "Deal not found")

    contact_name = ""
    contact = None
    if deal.contact_id:
        contact = session.get(Contact, deal.contact_id)
        if contact and contact.user_id == user.id:
            contact_name = contact.name

    context = (
        f"Contact: {contact_name or 'Unknown'}\n"
        f"Company: {contact.company if contact else 'N/A'}\n"
        f"Deal: {deal.title}\n"
        f"Value: INR {deal.value:,.0f}\n"
        f"Pipeline stage: {deal.stage}\n"
        f"Deal notes: {deal.notes or 'none'}\n"
        f"Contact notes: {contact.notes if contact else 'none'}"
    )

    result = generate_follow_up(context, body.instructions or "")
    draft = AiDraft(
        user_id=user.id,
        deal_id=deal.id,
        contact_name=contact_name,
        subject=result["subject"],
        body=result["body"],
        next_step=result["next_step"],
    )
    session.add(draft)
    session.commit()
    session.refresh(draft)
    return draft


@app.get("/ai/drafts")
def list_drafts(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    return session.exec(
        select(AiDraft).where(AiDraft.user_id == user.id).order_by(AiDraft.created_at.desc())
    ).all()


# ---------------- Billing (Razorpay) ----------------
@app.post("/billing/checkout")
def create_checkout(user: User = Depends(get_current_user)):
    amount = settings.PRO_PRICE_INR * 100
    order = rzp.order.create(
        {
            "amount": amount,
            "currency": "INR",
            "receipt": f"pro-{user.id}",
            "notes": {"user_id": str(user.id)},
        }
    )
    return {
        "key_id": settings.RAZORPAY_KEY_ID,
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "email": user.email,
    }


@app.post("/billing/verify")
def verify_payment(
    body: VerifyIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        rzp.utility.verify_payment_signature(
            {
                "razorpay_order_id": body.razorpay_order_id,
                "razorpay_payment_id": body.razorpay_payment_id,
                "razorpay_signature": body.razorpay_signature,
            }
        )
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(400, "Payment verification failed")

    user.plan = "pro"
    session.add(user)
    session.commit()
    return {"plan": "pro"}


@app.post("/billing/downgrade")
def downgrade(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
):
    user.plan = "free"
    session.add(user)
    session.commit()
    return {"plan": "free"}


@app.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    try:
        rzp.utility.verify_webhook_signature(
            payload.decode(), sig, settings.RAZORPAY_WEBHOOK_SECRET
        )
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(400, "Invalid webhook signature")

    event = json.loads(payload)
    if event.get("event") == "payment.captured":
        entity = event["payload"]["payment"]["entity"]
        user_id = (entity.get("notes") or {}).get("user_id")
        if user_id:
            with Session(engine) as session:
                u = session.get(User, int(user_id))
                if u:
                    u.plan = "pro"
                    session.add(u)
                    session.commit()

    return {"received": True}


@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"status": "ok", "service": "SoloCRM API"}
