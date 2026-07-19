import { useState } from "react";
import {
  STAGES,
  STAGE_STYLES,
  PRIORITY_STYLES,
  money,
  fmtDate,
  isOverdue,
  input,
  btnPrimary,
  btnGhost,
} from "../ui";

function csvCell(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function exportCsv(deals, contacts) {
  const nameOf = (id) => contacts.find((c) => c.id === id)?.name || "";
  const headers = [
    "Title", "Contact", "Value", "Stage", "Priority",
    "Expected Close", "Next Action", "Next Action Date", "Created",
  ];
  const rows = deals.map((d) => [
    d.title, nameOf(d.contact_id), d.value, d.stage, d.priority,
    d.expected_close_date || "", d.next_action || "", d.next_action_date || "",
    d.created_at ? new Date(d.created_at).toISOString().slice(0, 10) : "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function DealCard({ deal, contacts, onUpdate, onDelete, onOpen }) {
  const contact = contacts.find((c) => c.id === deal.contact_id);
  const open = deal.stage !== "Won" && deal.stage !== "Lost";
  const overdue = open && isOverdue(deal.next_action_date);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => onOpen(deal)} className="text-left text-sm font-medium leading-tight hover:text-emerald-700">
          {deal.title}
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Delete "${deal.title}"? This can't be undone.`)) onDelete(deal.id);
          }}
          className="text-xs text-slate-300 hover:text-rose-500"
          title="Delete deal"
        >
          ✕
        </button>
      </div>

      {contact && <div className="mt-0.5 text-xs text-slate-500">{contact.name}</div>}

      <div className="mt-1.5 flex items-center gap-2">
        <span className="font-mono text-xs text-emerald-700">{money(deal.value)}</span>
        {deal.priority && (
          <span className={"rounded px-1.5 py-0.5 text-[10px] font-medium " + (PRIORITY_STYLES[deal.priority] || "")}>
            {deal.priority}
          </span>
        )}
      </div>

      {deal.expected_close_date && (
        <div className="mt-1 text-[11px] text-slate-400">close {fmtDate(deal.expected_close_date)}</div>
      )}
      {overdue && <div className="mt-1 text-[11px] font-medium text-rose-600">⚠ follow-up overdue</div>}

      <select
        value={deal.stage}
        onChange={(e) => onUpdate(deal.id, { stage: e.target.value })}
        className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-emerald-400"
      >
        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}

export default function PipelineBoard({ deals, contacts, onCreate, onUpdate, onDelete, onOpen }) {
  const [open, setOpen] = useState(false);
  const EMPTY = {
    title: "", value: "", contact_id: "", stage: "Lead", priority: "Medium",
    expected_close_date: "", next_action: "", next_action_date: "",
  };
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onCreate({
        title: form.title,
        value: parseFloat(form.value) || 0,
        stage: form.stage,
        priority: form.priority,
        contact_id: form.contact_id ? Number(form.contact_id) : null,
        expected_close_date: form.expected_close_date || null,
        next_action: form.next_action || null,
        next_action_date: form.next_action_date || null,
      });
      setForm(EMPTY);
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not create deal");
    } finally {
      setBusy(false);
    }
  }

  const nameOf = (id) => contacts.find((c) => c.id === id)?.name || "";
  const q = query.trim().toLowerCase();
  const visible = deals.filter((d) => {
    if (priorityFilter !== "All" && d.priority !== priorityFilter) return false;
    if (!q) return true;
    return (
      d.title.toLowerCase().includes(q) || nameOf(d.contact_id).toLowerCase().includes(q)
    );
  });

  const total = visible
    .filter((d) => d.stage !== "Lost")
    .reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="font-display text-lg font-semibold">
          Pipeline{" "}
          <span className="ml-1 font-mono text-sm font-normal text-emerald-700">{money(total)} open</span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportCsv(visible, contacts)}
            disabled={visible.length === 0}
            className={btnGhost + " text-sm"}
          >
            Export CSV
          </button>
          <button onClick={() => setOpen((o) => !o)} className={btnGhost + " text-sm"}>
            {open ? "Close" : "+ New deal"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
        <input
          className={input + " sm:max-w-xs"}
          placeholder="Search deals by title or contact…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={input + " sm:w-44"} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          {["All", "High", "Medium", "Low"].map((p) => (
            <option key={p} value={p}>{p === "All" ? "All priorities" : `${p} priority`}</option>
          ))}
        </select>
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={input} placeholder="Deal title *" required value={form.title} onChange={(e) => set("title", e.target.value)} />
            <input className={input} type="number" min="0" placeholder="Value (₹)" value={form.value} onChange={(e) => set("value", e.target.value)} />
            <select className={input} value={form.contact_id} onChange={(e) => set("contact_id", e.target.value)}>
              <option value="">— Link a contact (optional) —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className={input} value={form.stage} onChange={(e) => set("stage", e.target.value)}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={input} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {["Low", "Medium", "High"].map((p) => <option key={p} value={p}>{p} priority</option>)}
            </select>
            <label className="flex flex-col text-xs text-slate-500">
              Expected close date
              <input className={input} type="date" value={form.expected_close_date} onChange={(e) => set("expected_close_date", e.target.value)} />
            </label>
            <input className={input} placeholder="Next action (e.g. send proposal)" value={form.next_action} onChange={(e) => set("next_action", e.target.value)} />
            <label className="flex flex-col text-xs text-slate-500">
              Next action by
              <input className={input} type="date" value={form.next_action_date} onChange={(e) => set("next_action_date", e.target.value)} />
            </label>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={btnPrimary + " text-sm"}>
            {busy ? "Adding…" : "Add deal"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((stage) => {
          const col = visible.filter((d) => d.stage === stage);
          const s = STAGE_STYLES[stage];
          return (
            <div key={stage} className="rounded-xl bg-slate-50 p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  {stage}
                </span>
                <span className="text-xs text-slate-400">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((d) => (
                  <DealCard key={d.id} deal={d} contacts={contacts} onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen} />
                ))}
                {col.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-[11px] text-slate-300">
                    empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}