import { useState } from "react";
import { STAGES, STAGE_STYLES, money, input, btnPrimary, btnGhost } from "../ui";

function DealCard({ deal, contacts, onUpdate, onDelete }) {
  const contact = contacts.find((c) => c.id === deal.contact_id);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-tight">{deal.title}</div>
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
      <div className="mt-2 font-mono text-xs text-emerald-700">{money(deal.value)}</div>
      <select
        value={deal.stage}
        onChange={(e) => onUpdate(deal.id, { stage: e.target.value })}
        className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-emerald-400"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PipelineBoard({ deals, contacts, onCreate, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", contact_id: "", stage: "Lead" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onCreate({
        title: form.title,
        value: parseFloat(form.value) || 0,
        stage: form.stage,
        contact_id: form.contact_id ? Number(form.contact_id) : null,
      });
      setForm({ title: "", value: "", contact_id: "", stage: "Lead" });
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not create deal");
    } finally {
      setBusy(false);
    }
  }

  const total = deals
    .filter((d) => d.stage !== "Lost")
    .reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="font-display text-lg font-semibold">
          Pipeline{" "}
          <span className="ml-1 font-mono text-sm font-normal text-emerald-700">
            {money(total)} open
          </span>
        </h2>
        <button onClick={() => setOpen((o) => !o)} className={btnGhost + " text-sm"}>
          {open ? "Close" : "+ New deal"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={input}
              placeholder="Deal title *"
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
            <input
              className={input}
              type="number"
              min="0"
              placeholder="Value ($)"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
            />
            <select
              className={input}
              value={form.contact_id}
              onChange={(e) => set("contact_id", e.target.value)}
            >
              <option value="">— Link a contact (optional) —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className={input}
              value={form.stage}
              onChange={(e) => set("stage", e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={btnPrimary + " text-sm"}>
            {busy ? "Adding…" : "Add deal"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((stage) => {
          const col = deals.filter((d) => d.stage === stage);
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
                  <DealCard
                    key={d.id}
                    deal={d}
                    contacts={contacts}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
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