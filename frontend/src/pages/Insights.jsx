import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api";
import { money, fmtDate, STAGE_STYLES, card } from "../ui";

function Stat({ label, value, sub }) {
  return (
    <div className={card + " p-5"}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function Insights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message || "Could not load"));
  }, []);

  const maxCount = data ? Math.max(1, ...data.funnel.map((f) => f.count)) : 1;
  const winPct = data && data.win_rate != null ? Math.round(data.win_rate * 100) : null;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-5 px-5 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold tracking-tight">Insights</h1>
          <Link to="/app" className="text-sm font-medium text-emerald-700 hover:underline">
            Back to pipeline
          </Link>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!data && !error && <p className="text-slate-400">Loading…</p>}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Win rate"
                value={winPct == null ? "—" : `${winPct}%`}
                sub={`${data.counts.won} won · ${data.counts.lost} lost`}
              />
              <Stat label="Open pipeline" value={money(data.open_pipeline_value)} sub={`${data.counts.open} active deals`} />
              <Stat label="Won this month" value={money(data.won_value_this_month)} sub={`${money(data.won_value_total)} all time`} />
              <Stat label="Avg deal size" value={money(data.avg_deal_size)} sub="across won deals" />
            </div>

            {/* Win-rate ratio bar */}
            {winPct != null && (
              <div className={card + " p-5"}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Success ratio (won vs lost)</span>
                  <span className="font-mono text-slate-500">{winPct}% win</span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: `${winPct}%` }} />
                  <div className="h-full bg-rose-400" style={{ width: `${100 - winPct}%` }} />
                </div>
              </div>
            )}

            {/* Funnel */}
            <div className={card + " p-5"}>
              <div className="mb-3 text-sm font-medium">Pipeline funnel</div>
              <div className="space-y-2">
                {data.funnel.map((f) => (
                  <div key={f.stage} className="flex items-center gap-3">
                    <div className="w-20 shrink-0 text-xs text-slate-500">{f.stage}</div>
                    <div className="flex-1">
                      <div
                        className={"h-6 rounded-md " + (STAGE_STYLES[f.stage]?.bar || "bg-slate-300")}
                        style={{ width: `${(f.count / maxCount) * 100}%`, minWidth: f.count ? "8px" : "0" }}
                      />
                    </div>
                    <div className="w-32 shrink-0 text-right text-xs text-slate-500">
                      {f.count} · <span className="font-mono">{money(f.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Closing this month */}
              <div className={card + " p-5"}>
                <div className="mb-3 text-sm font-medium">Closing this month</div>
                {data.closing_this_month.length === 0 ? (
                  <p className="text-sm text-slate-400">Nothing scheduled to close this month.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.closing_this_month.map((d) => (
                      <li key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span>{d.title}</span>
                        <span className="text-slate-500">
                          <span className="font-mono">{money(d.value)}</span> · {fmtDate(d.expected_close_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Needs attention */}
              <div className={card + " p-5"}>
                <div className="mb-3 text-sm font-medium">Needs attention</div>
                {data.overdue_actions.length === 0 ? (
                  <p className="text-sm text-slate-400">No overdue follow-ups. Nice.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.overdue_actions.map((d) => (
                      <li key={d.id} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm">
                        <div className="font-medium text-rose-800">{d.title}</div>
                        <div className="text-xs text-rose-600">
                          {d.next_action || "Follow up"} · was due {fmtDate(d.next_action_date)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div className={card + " p-5"}>
              <div className="mb-3 text-sm font-medium">Recent activity</div>
              {data.recent_activities.length === 0 ? (
                <p className="text-sm text-slate-400">No activity logged yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.recent_activities.map((a) => (
                    <li key={a.id} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                      <span className="text-slate-700">
                        <span className="capitalize text-slate-400">{a.type.replace("_", " ")}: </span>
                        {a.note}
                      </span>
                      <span className="shrink-0 pl-3 text-xs text-slate-400">
                        {new Date(a.occurred_at).toLocaleDateString("en-IN")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
