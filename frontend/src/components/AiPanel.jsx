import { useState } from "react";
import { money, btnPrimary, input } from "../ui";

export default function AiPanel({ deals, drafts, account, onGenerate, onUpgrade }) {
  const [dealId, setDealId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPro = account?.plan === "pro";
  const limit = account?.ai_daily_limit;
  const maxedOut = !isPro && limit != null && account?.ai_used_today >= limit;

  async function generate() {
    setError("");
    setResult(null);
    if (!dealId) {
      setError("Pick a deal first.");
      return;
    }
    setBusy(true);
    try {
      const draft = await onGenerate(Number(dealId), instructions);
      setResult(draft);
    } catch (err) {
      setError(err.message || "Could not generate a draft");
    } finally {
      setBusy(false);
    }
  }

  function copyEmail(d) {
    const text = `Subject: ${d.subject}\n\n${d.body}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-display text-lg font-semibold">AI follow-up</h2>
        <p className="mt-1 text-sm text-slate-500">
          Turn a deal into a ready-to-send email and a recommended next step.
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <select
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          className={input}
        >
          <option value="">Choose a deal…</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} · {money(d.value)} · {d.stage}
            </option>
          ))}
        </select>

        <div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            className={input}
            placeholder="Extra instructions (optional) — e.g. keep it under 80 words, formal tone, mention the pilot discount"
          />
          <p className="mt-1 text-xs text-slate-400">
            Steer the email: tone, length, offers, anything specific to include.
          </p>
        </div>

        <button onClick={generate} disabled={busy || maxedOut} className={btnPrimary + " text-sm"}>
          {busy ? "Drafting…" : "Draft follow-up"}
        </button>

        {maxedOut && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            <p>You've used your {limit} AI drafts for today.</p>
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="mt-2 inline-flex rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:opacity-90"
              >
                Unlock unlimited with Pro
              </button>
            )}
          </div>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Suggested email
            </div>
            <div className="mt-2 text-sm font-medium">{result.subject}</div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{result.body}</p>
            {result.next_step && (
              <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">Next step: </span>
                {result.next_step}
              </div>
            )}
            <button
              onClick={() => copyEmail(result)}
              className="mt-3 text-xs font-medium text-emerald-700 hover:underline"
            >
              {copied ? "Copied ✓" : "Copy email"}
            </button>
          </div>
        )}
      </div>

      {drafts.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Recent drafts</div>
          <ul className="space-y-2">
            {drafts.slice(0, 4).map((d) => (
              <li key={d.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="font-medium">{d.subject || "Follow-up"}</div>
                <div className="text-xs text-slate-500">
                  {d.contact_name ? `${d.contact_name} · ` : ""}
                  {new Date(d.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}