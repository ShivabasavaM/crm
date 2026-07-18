# SoloCRM — Backend (FastAPI)

A CRM for solopreneurs: contacts + a deal pipeline tied to the logged-in user,
plus an AI feature that drafts a follow-up email and next step for any deal (Gemini).

- **Free plan:** up to 10 contacts, 3 AI drafts/day.
- **Pro plan:** unlimited (unlocked via a Razorpay payment).

## Run locally

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in GEMINI + RAZORPAY test keys
python -m uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs. SQLite locally, no DB setup needed.

## Razorpay setup (test mode — free, no activation)

1. Sign up at razorpay.com and keep the **Test Mode** toggle on.
2. Dashboard → Settings → API Keys → **Generate Test Key**. Put the key id
   (`rzp_test_...`) and secret into `.env` as `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
3. Test payment: card `4111 1111 1111 1111`, any future expiry, any CVC — or UPI id
   `success@razorpay`.
4. Locally, upgrade is confirmed by `POST /billing/verify` (server-side signature check),
   so no tunnel is needed. The `POST /webhooks/razorpay` handler (event `payment.captured`)
   is used in production — configure it in the Razorpay Dashboard pointing at your deployed
   URL and put its secret in `RAZORPAY_WEBHOOK_SECRET`.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /auth/signup, /auth/login | Auth → JWT |
| GET  | /account | Plan, usage, limits |
| GET/POST/PATCH/DELETE | /contacts | Contacts CRUD (create gated on free) |
| GET/POST/PATCH/DELETE | /deals | Pipeline CRUD |
| POST | /ai/follow-up | AI email + next step (gated 3/day free) |
| GET | /ai/drafts | AI draft history |
| POST | /billing/checkout | Create Razorpay order |
| POST | /billing/verify | Verify payment signature → set Pro |
| POST | /billing/downgrade | Cancel → back to Free |
| POST | /webhooks/razorpay | Server-side payment.captured → set Pro |

## Deploy (Render)

- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env: everything in `.env.example` (use Neon `DATABASE_URL`, set `FRONTEND_URL` to your Vercel URL).
- Add the Razorpay webhook (`https://YOUR-RENDER-URL/webhooks/razorpay`, event
  `payment.captured`) and set `RAZORPAY_WEBHOOK_SECRET`.
