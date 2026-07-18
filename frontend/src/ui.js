export const STAGES = ["Lead", "Contacted", "Proposal", "Won", "Lost"];

export const STAGE_STYLES = {
  Lead: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-700 border-slate-200" },
  Contacted: { dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  Proposal: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  Won: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Lost: { dot: "bg-rose-400", chip: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function money(n) {
  const v = Number(n || 0);
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export const btn =
  "inline-flex items-center justify-center rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
export const btnPrimary =
  btn + " bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2";
export const btnGhost =
  btn + " border border-slate-300 text-ink hover:bg-slate-50 px-4 py-2";
export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
export const card = "rounded-2xl border border-slate-200 bg-white";
