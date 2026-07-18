# SoloCRM — Frontend (Vite + React + Tailwind)

Landing + pricing, signup/login (JWT in localStorage), the CRM dashboard
(contacts + deal pipeline + AI follow-up), and a billing/account page.
Payments use Razorpay Checkout (test mode).

## Run locally

Backend must be running first (http://localhost:8000).

```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_URL defaults to localhost:8000
npm run dev
```

Open http://localhost:5173.

## Full local test flow

1. Sign up → land on the pipeline.
2. Add a contact, add a deal linked to it, move it between stages via the card dropdown.
3. AI follow-up → pick the deal → **Draft follow-up** → email + next step (saved to history).
4. Do it 3× on free → 4th is blocked with an upgrade prompt (also 11th contact is blocked).
5. Pricing / Account → **Upgrade to Pro** → Razorpay popup → pay with card
   `4111 1111 1111 1111` (any future date/CVC) or UPI `success@razorpay`.
   The app verifies the signature server-side and flips you to Pro → limits gone.
6. Account → **Downgrade to Free** to cancel and re-apply the free limits.

## Deploy (Vercel)

- Import repo → Root Directory `frontend`, framework Vite, build `npm run build`, output `dist`.
- Env var `VITE_API_URL` = your Render backend URL.
- `vercel.json` rewrites all routes to `index.html` so refreshing `/app` works.
- Set the backend's `FRONTEND_URL` (on Render) to your Vercel URL for CORS.
