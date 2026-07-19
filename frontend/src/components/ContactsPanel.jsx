import { useState } from "react";
import { input, btnPrimary, btnGhost } from "../ui";

const EMPTY = { name: "", email: "", company: "", phone: "", notes: "" };

export default function ContactsPanel({ contacts, onCreate, onUpdate, onDelete, onUpgrade }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [capReached, setCapReached] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
    setCapReached(false);
    setOpen(true);
  }
  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      name: c.name || "",
      email: c.email || "",
      company: c.company || "",
      phone: c.phone || "",
      notes: c.notes || "",
    });
    setError("");
    setCapReached(false);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  function validate() {
    if (!form.name.trim()) return "Name is required.";
    if (!form.email.trim() && !form.phone.trim()) return "Add an email or a phone number.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return "That email address doesn't look right.";
    return "";
  }

  async function submit(e) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError("");
    setCapReached(false);
    setBusy(true);
    try {
      if (editingId) await onUpdate(editingId, form);
      else await onCreate(form);
      close();
    } catch (err) {
      if (err.status === 402) {
        setCapReached(true);
        setError(err.message);
      } else {
        setError(err.message || "Could not save contact");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(c) {
    if (window.confirm(`Delete ${c.name}? This can't be undone.`)) onDelete(c.id);
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? contacts.filter((c) =>
        [c.name, c.company, c.email, c.phone]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(q))
      )
    : contacts;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="font-display text-lg font-semibold">
          Contacts <span className="ml-1 text-sm font-normal text-slate-400">{contacts.length}</span>
        </h2>
        <button onClick={() => (open ? close() : startAdd())} className={btnGhost + " text-sm"}>
          {open ? "Close" : "+ Add contact"}
        </button>
      </div>

      {contacts.length > 0 && (
        <div className="border-b border-slate-100 px-5 py-3">
          <input
            className={input}
            placeholder="Search contacts by name, company, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="space-y-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {editingId ? "Edit contact" : "New contact"}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={input} placeholder="Name *" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <input className={input} placeholder="Company" value={form.company} onChange={(e) => set("company", e.target.value)} />
            <input className={input} placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <p className="text-xs text-slate-400">Add at least an email or a phone number.</p>
          <textarea
            className={input}
            rows={2}
            placeholder="Notes (context for the AI follow-up)"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {capReached && onUpgrade && (
            <button type="button" onClick={onUpgrade} className={btnPrimary + " text-sm"}>
              Unlock unlimited contacts with Pro
            </button>
          )}
          {!capReached && (
            <button type="submit" disabled={busy} className={btnPrimary + " text-sm"}>
              {busy ? "Saving…" : editingId ? "Save changes" : "Save contact"}
            </button>
          )}
        </form>
      )}

      <ul className="divide-y divide-slate-100">
        {contacts.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-slate-400">
            No contacts yet. Add the first person you're selling to.
          </li>
        )}
        {contacts.length > 0 && filtered.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-slate-400">No contacts match “{query}”.</li>
        )}
        {filtered.map((c) => (
          <li key={c.id} className="flex items-start justify-between px-5 py-3">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-slate-500">
                {[c.company, c.email, c.phone].filter(Boolean).join(" · ")}
              </div>
              {c.notes && <div className="mt-1 text-xs text-slate-400">{c.notes}</div>}
            </div>
            <div className="flex shrink-0 gap-3 pl-3">
              <button onClick={() => startEdit(c)} className="text-xs text-slate-400 hover:text-emerald-700">
                Edit
              </button>
              <button onClick={() => handleDelete(c)} className="text-xs text-slate-400 hover:text-rose-600">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}