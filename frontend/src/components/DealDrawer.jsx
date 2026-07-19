import { useEffect, useState } from "react";
import { api } from "../api";
import { money, input, btnPrimary, btnGhost, STAGES } from "../ui";

const TYPE_LABEL = {
  note: "📝 Note",
  call: "📞 Call",
  email: "✉️ Email",
  meeting: "🤝 Meeting",
  stage_change: "🔀 Stage change",
};

export default function DealDrawer({ deal, contacts, onClose, onUpdate }) {
  const [activities, setActivities] = useState([]);
  const [type, setType] = useState("note");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Full editable copy of the deal.
  const [edit, setEdit] = useState({
    title: deal.title || "",
    value: deal.value ?? "",
    stage: deal.stage || "Lead",
    contact_id: deal.contact_id ? String(deal.contact_id) : "",
    priority: deal.priority || "Medium",
    expected_close_date: deal.expected_close_date || "",
    next_action: deal.next_action || "",
    next_action_date: deal.next_action_date || "",
    notes: deal.notes || "",
  });
  const set = (k, v) => setEdit((e) => ({ ...e, [k]: v }));

  async function loadActivities() {
    try {
      setActivities(await api.listActivities(deal.id));
    } catch {
      setActivities([]);
    }
  }

  useEffect(() => {
    loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  async function logActivity(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api.addActivity(deal.id, { type, note });
      setNote("");
      setType("note");
      await loadActivities();
    } finally {
      setBusy(false);
    }
  }

  async function saveDeal() {
    setBusy(true);
    setSaved(false);
    try {
      await onUpdate(deal.id, {
        title: edit.title,
        value: parseFloat(edit.value) || 0,
        stage: edit.stage,
        contact_id: edit.contact_id ? Number(edit.contact_id) : null,
        priority: edit.priority,
        expected_close_date: edit.expected_close_date || null,
        next_action: edit.next_action || null,
        next_action_date: edit.next_action_date || null,
        notes: edit.notes,
      });
      setSaved(true);
      // if stage changed, the backend logged an activity — refresh the timeline
      await loadActivities();
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-400">Deal</div>
          <button onClick={onClose} className="text-slate-400 hover:text-ink">✕</button>
        </div>

        {/* Editable deal */}
        <div className="mt-3 space-y-3">
          <input
            className={input + " font-display text-lg font-semibold"}
            value={edit.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Deal title"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-slate-500">
              Value (₹)
              <input className={input} type="number" min="0" value={edit.value} onChange={(e) => set("value", e.target.value)} />
            </label>
            <label className="block text-xs text-slate-500">
              Stage
              <select className={input} value={edit.stage} onChange={(e) => set("stage", e.target.value)}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-500">
              Contact
              <select className={input} value={edit.contact_id} onChange={(e) => set("contact_id", e.target.value)}>
                <option value="">— none —</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-500">
              Priority
              <select className={input} value={edit.priority} onChange={(e) => set("priority", e.target.value)}>
                {["Low", "Medium", "High"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-500">
              Expected close
              <input className={input} type="date" value={edit.expected_close_date || ""} onChange={(e) => set("expected_close_date", e.target.value)} />
            </label>
            <label className="block text-xs text-slate-500">
              Next action by
              <input className={input} type="date" value={edit.next_action_date || ""} onChange={(e) => set("next_action_date", e.target.value)} />
            </label>
          </div>

          <label className="block text-xs text-slate-500">
            Next action
            <input className={input} value={edit.next_action || ""} onChange={(e) => set("next_action", e.target.value)} placeholder="e.g. send revised proposal" />
          </label>

          <label className="block text-xs text-slate-500">
            Notes
            <textarea className={input} rows={3} value={edit.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Context, requirements, anything the AI should know" />
          </label>

          <div className="flex items-center gap-3">
            <button onClick={saveDeal} disabled={busy} className={btnPrimary + " text-sm"}>
              {busy ? "Saving…" : "Save deal"}
            </button>
            {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
            <span className="ml-auto font-mono text-sm text-emerald-700">{money(edit.value)}</span>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="mt-7">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Activity timeline</div>

          <form onSubmit={logActivity} className="mb-4 space-y-2 rounded-xl border border-slate-200 p-3">
            <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
            </select>
            <textarea
              className={input}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened? (e.g. Left a voicemail, following up Friday)"
            />
            <button type="submit" disabled={busy} className={btnGhost + " text-sm"}>
              {busy ? "Logging…" : "Log activity"}
            </button>
          </form>

          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {activities.length === 0 && (
              <li className="text-sm text-slate-400">No activity yet. Log the first touchpoint above.</li>
            )}
            {activities.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                <div className="text-sm font-medium">{TYPE_LABEL[a.type] || a.type}</div>
                {a.note && <div className="text-sm text-slate-600">{a.note}</div>}
                <div className="text-xs text-slate-400">{new Date(a.occurred_at).toLocaleString("en-IN")}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}