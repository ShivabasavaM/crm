import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../auth";
import { api } from "../api";
import { openRazorpayCheckout } from "../lib/razorpay";
import { btnPrimary, btnGhost } from "../ui";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    price: "₹0",
    cadence: "forever",
    tagline: "Enough to run your first deals.",
    features: ["Up to 10 contacts", "Full deal pipeline", "3 AI follow-up drafts / day"],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹499",
    cadence: "one-time unlock",
    tagline: "For when the pipeline gets real.",
    features: [
      "Unlimited contacts",
      "Full deal pipeline",
      "Unlimited AI follow-up drafts",
      "Downgrade anytime",
    ],
    highlight: true,
  },
];

export default function Pricing() {
  const { account } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function goPro() {
    setError("");
    if (!account) {
      navigate("/signup?next=pro");
      return;
    }
    if (account.plan === "pro") {
      navigate("/account");
      return;
    }
    setBusy(true);
    try {
      const order = await api.checkout();
      await openRazorpayCheckout(order, {
        onSuccess: async (resp) => {
          try {
            await api.verifyPayment(resp);
            window.location.href = "/app?upgraded=1";
          } catch (e) {
            setError(e.message || "Payment verification failed");
            setBusy(false);
          }
        },
        onDismiss: () => setBusy(false),
      });
    } catch (e) {
      setError(e.message || "Could not start checkout");
      setBusy(false);
    }
  }

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="text-center font-display text-4xl font-bold tracking-tight">
          Simple pricing
        </h1>
        <p className="mt-3 text-center text-slate-600">
          Start free. Upgrade when your deals do.
        </p>

        {params.get("canceled") && (
          <p className="mx-auto mt-6 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            Checkout canceled — no charge was made. Upgrade whenever you're ready.
          </p>
        )}
        {error && (
          <p className="mx-auto mt-6 max-w-md rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className={
                "rounded-3xl border p-7 " +
                (t.highlight
                  ? "border-emerald-300 bg-white ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white")
              }
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">{t.name}</h2>
                {t.highlight && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">{t.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{t.price}</span>
                <span className="text-sm text-slate-500">{t.cadence}</span>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                {t.id === "starter" ? (
                  <Link to={account ? "/app" : "/signup"} className={btnGhost + " w-full"}>
                    {account ? "Go to pipeline" : "Start free"}
                  </Link>
                ) : (
                  <button onClick={goPro} disabled={busy} className={btnPrimary + " w-full"}>
                    {busy
                      ? "Opening checkout…"
                      : account?.plan === "pro"
                      ? "Manage plan"
                      : "Upgrade to Pro"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Test mode — use card 4111 1111 1111 1111, any future date, any CVC (or UPI id
          success@razorpay).
        </p>
      </div>
    </div>
  );
}
