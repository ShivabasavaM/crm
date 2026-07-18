import { btnPrimary, btnGhost } from "../ui";

export default function UpgradeModal({ open, onUpgrade, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          SoloCRM Pro
        </div>
        <h3 className="mt-1 font-display text-2xl font-semibold">
          Run an unlimited pipeline
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Go Pro to remove every limit and keep the deals moving.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-600">✓</span> Unlimited contacts
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-600">✓</span> Unlimited AI follow-up drafts
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-600">✓</span> Cancel anytime
          </li>
        </ul>
        <div className="mt-6 flex gap-3">
          <button
            onClick={async () => {
              onClose();
              await onUpgrade();
            }}
            className={btnPrimary}
          >
            Upgrade to Pro
          </button>
          <button onClick={onClose} className={btnGhost}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}