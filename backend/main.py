import json
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select
import razorpay

from config import settings, PIPELINE_STAGES
from database import init_db, get_session, engine
from models import User, Contact, Deal, AiDraft
from auth import hash_password, verify_password, create_token, get_current_user
from ai import generate_follow_up

rzp = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="SoloCRM API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
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


class DealUpdate(BaseModel):
    title: str | None = None
    contact_id: int | None = None
    value: float | None = None
    stage: str | None = None
    notes: str | None = None


class FollowUpIn(BaseModel):
    deal_id: int


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
    for k, v in data.items():
        setattr(deal, k, v)
    deal.updated_at = datetime.utcnow()
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
    session.delete(deal)
    session.commit()
    return {"ok": True}


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

    result = generate_follow_up(context)
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
    amount = settings.PRO_PRICE_INR * 100  # Razorpay uses paise
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
    payload = await request.body()  # RAW body required for signature check
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


@app.get("/")
def root():
    return {"status": "ok", "service": "SoloCRM API"}
