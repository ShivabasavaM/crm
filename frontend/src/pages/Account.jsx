import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api";
import { openRazorpayCheckout } from "../lib/razorpay";
import { btnPrimary, btnGhost, card } from "../ui";

export default function Account() {
  const [acct, setAcct] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() {
    return api.account().then(setAcct);
  }

  useEffect(() => {
    reload().catch(() => setError("Could not load account"));
  }, []);

  async function upgrade() {
    setError("");
    setBusy(true);
    try {
      const order = await api.checkout();
      await openRazorpayCheckout(order, {
        onSuccess: async (resp) => {
          try {
            await api.verifyPayment(resp);
            await reload();
          } catch (e) {
            setError(e.message || "Payment verification failed");
          }
          setBusy(false);
        },
        onDismiss: () => setBusy(false),
      });
    } catch (e) {
      setError(e.message || "Could not start checkout");
      setBusy(false);
    }
  }

  async function cancel() {
    setError("");
    setBusy(true);
    try {
      await api.downgrade();
      await reload();
    } catch (e) {
      setError(e.message || "Could not downgrade");
    } finally {
      setBusy(false);
    }
  }

  const isPro = acct?.plan === "pro";

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl font-bold tracking-tight">Account</h1>

        {!acct ? (
          <p className="mt-8 text-slate-400">Loading…</p>
        ) : (
          <div className={card + " mt-8 p-6"}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Signed in as</div>
                <div className="font-medium">{acct.email}</div>
              </div>
              <span
                className={
                  "rounded-full px-3 py-1 text-sm font-medium capitalize " +
                  (isPro ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")
                }
              >
                {acct.plan} plan
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-4 py-5 text-sm">
              <div>
                <dt className="text-slate-400">Contacts</dt>
                <dd className="font-mono">
                  {acct.contact_count}
                  {acct.contact_limit != null ? ` / ${acct.contact_limit}` : " · unlimited"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">AI drafts today</dt>
                <dd className="font-mono">
                  {acct.ai_used_today}
                  {acct.ai_daily_limit != null ? ` / ${acct.ai_daily_limit}` : " · unlimited"}
                </dd>
              </div>
            </dl>

            {error && (
              <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {isPro ? (
                <button onClick={cancel} disabled={busy} className={btnGhost}>
                  {busy ? "Working…" : "Downgrade to Free (cancel)"}
                </button>
              ) : (
                <button onClick={upgrade} disabled={busy} className={btnPrimary}>
                  {busy ? "Opening checkout…" : "Upgrade to Pro"}
                </button>
              )}
              <Link to="/app" className={btnGhost}>
                Back to pipeline
              </Link>
            </div>

            {isPro && (
              <p className="mt-4 text-xs text-slate-400">
                Downgrading returns you to the Starter plan immediately and re-applies the
                free limits.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
