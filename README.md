# SoloCRM

**A full-stack, AI-powered CRM for one-person sales teams.** A stranger can land on the page, sign up, use a real product, hit a paywall, pay with a card/netbanking, and get upgraded automatically — no human in the loop.

🔗 **Live app:** https://thesolocrm.vercel.app

🎥 **Demo video:** https://drive.google.com/drive/folders/1tD91GK1zCzYgtd5GWgjnimsPfPhhLpw5?usp=sharing

> Payments run in **Razorpay test mode** — no real money moves. To test the upgrade, use the checkout's **Netbanking → any bank → Success** flow (details below).

---

## What it is

Most CRMs are built for sales teams and are overkill for a freelancer or solo founder. SoloCRM keeps it to what one person actually needs: track your contacts, move deals through a pipeline, let AI write the follow-up email you keep putting off, and see whether you're actually winning — all in one screen.

---

## Feature highlights

- **Marketing site + pricing** — hero, feature highlights, and two tiers (Starter / Pro) that gate real functionality, linking straight into signup.
- **Authentication** — email + password with JWT; sessions persist across reloads.
- **Contacts** — full CRUD, per-user, searchable, with notes that feed the AI.
- **Deal pipeline** — five stages (Lead → Contacted → Proposal → Won → Lost), deal value, priority, expected close date, and a next-action reminder. Overdue follow-ups are flagged.
- **Activity timeline** — every deal has a log of calls, emails, meetings, and notes; stage changes are recorded automatically.
- **AI follow-up (Google Gemini)** — turns a deal's context into a ready-to-send email + a recommended next step, with an optional box for custom instructions (tone, length, offers).
- **Insights dashboard** — win rate (success/tried ratio), open pipeline value, revenue won this month vs all-time, average deal size, a stage funnel, deals closing this month, and overdue follow-ups.
- **Subscriptions & payments (Razorpay)** — self-serve checkout → server-side payment verification and a `payment.captured` webhook → account upgraded in the database. The plan tier actually gates the product.
- **Billing/account page** — see your current plan and usage, upgrade, or cancel (downgrade).
- **CSV export** of the pipeline.

---

## How the requirements are met

| Requirement | How SoloCRM meets it |
|---|---|
| Marketing / landing page with 2 pricing tiers linking to signup | `/` and `/pricing`, Starter (free) vs Pro, both route into the signup/checkout flow |
| Real authentication, sessions persist on reload | JWT issued on signup/login, stored client-side and re-validated on load |
| A real, per-user core feature backed by a database | Contacts + deal pipeline + AI follow-ups, all persisted per user in Postgres |
| Subscriptions & payments in test mode | Razorpay test-mode order → checkout → payment |
| Checkout → webhook confirms payment → account upgraded | Server verifies the payment signature and handles the `payment.captured` webhook, then sets the plan in the DB |
| Plan tier gates functionality | Free = 10 contacts + 3 AI drafts/day; Pro = unlimited |
| Billing page: view plan + cancel | Account page shows plan/usage and supports downgrade |
| Deployed, reachable via a public URL | Frontend on Vercel, backend on Render, DB on Neon |

---

## Architecture

```
                 ┌─────────────────────────────┐
   Browser  ───► │  React + Tailwind (Vite)     │  ── deployed on Vercel
                 │  JWT stored in localStorage  │
                 └──────────────┬──────────────┘
                                │  JSON over HTTPS (Bearer token)
                                ▼
                 ┌─────────────────────────────┐
                 │  FastAPI (Python)            │  ── deployed on Render
                 │  auth · CRM · gating · AI    │
                 └───┬───────────┬───────────┬──┘
                     │           │           │
                     ▼           ▼           ▼
              Neon Postgres   Google       Razorpay
              (SQLModel)      Gemini       (order + webhook)
```

- The payment provider is isolated to the billing routes + one webhook, so the rest of the app is provider-agnostic.
- Gating is enforced **server-side**, so limits can't be bypassed from the browser.
- The database schema self-migrates on startup (new columns/tables are applied automatically).

---

## Tech stack

**Frontend:** React (Vite), Tailwind CSS, React Router — hosted on **Vercel**
**Backend:** FastAPI, SQLModel, PyJWT, bcrypt — hosted on **Render**
**Database:** Neon (serverless Postgres)
**AI:** Google Gemini (`gemini-2.5-flash`)
**Payments:** Razorpay (test mode)

---

## Try the payment flow (test mode)

1. Sign up, then use the free tier until you hit a limit (3 AI drafts/day or 10 contacts).
2. Click **Upgrade to Pro** → Razorpay checkout opens.
3. Choose **Netbanking** → pick any bank → **Pay Now** → click **Success** on the simulated page.
4. You're upgraded to Pro and the limits disappear.

(No card or real money required. Card and UPI test instruments also work depending on account settings.)

---

## Running locally

The repo is split into two apps, each with its own setup guide:

- **Backend** — see [`backend/README.md`](backend/README.md) (FastAPI, needs Python 3.12; falls back to SQLite locally so it runs with zero DB setup)
- **Frontend** — see [`frontend/README.md`](frontend/README.md) (Vite dev server, points at the backend via `VITE_API_URL`)

Quick version:

```bash
# backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in your keys
python -m uvicorn main:app --reload --port 8000

# frontend (new terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm run dev
```

---

## Notes & honest scope

This was built as a hackathon project. A few deliberate choices worth calling out: the Pro upgrade is a one-time unlock rather than a recurring subscription (Razorpay recurring needs extra account activation); Render's free tier cold-starts after inactivity, so the first request may be slow; and everything payment-related is test mode by design.

## What's next

Recurring subscriptions, a "Won → Project" delivery tracker, sending the AI email directly, and reminders for overdue follow-ups.
