import { Link } from "react-router-dom";

function Meter({ label, used, limit }) {
  const unlimited = limit === null || limit === undefined;
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  const maxed = !unlimited && used >= limit;
  return (
    <div className="min-w-[150px]">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={"font-mono " + (maxed ? "text-rose-600" : "text-slate-700")}>
          {used}
          {unlimited ? "" : ` / ${limit}`}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={"h-full rounded-full " + (maxed ? "bg-rose-500" : "bg-emerald-500")}
          style={{ width: unlimited ? "18%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function UsageBar({ account }) {
  if (!account) return null;
  const isPro = account.plan === "pro";
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Plan</div>
        <div className="font-display text-lg font-semibold capitalize">
          {account.plan}
          {isPro && <span className="ml-1 text-emerald-600">✦</span>}
        </div>
      </div>
      <Meter label="Contacts" used={account.contact_count} limit={account.contact_limit} />
      <Meter label="AI drafts today" used={account.ai_used_today} limit={account.ai_daily_limit} />
      {isPro && (
        <div className="ml-auto">
          <Link to="/account" className="text-sm font-medium text-emerald-700 hover:underline">
            Manage plan
          </Link>
        </div>
      )}
    </div>
  );
}