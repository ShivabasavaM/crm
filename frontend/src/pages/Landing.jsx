import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { STAGES, STAGE_STYLES, money, btnPrimary, btnGhost } from "../ui";

const DEMO = [
  { stage: "Lead", name: "Priya · Nimbus Studio", value: 4000 },
  { stage: "Contacted", name: "Marcus · Foldy", value: 9500 },
  { stage: "Proposal", name: "Elena · Kettle Co", value: 22000 },
  { stage: "Won", name: "Dev · Arclight", value: 14000 },
];

function MiniBoard() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STAGES.slice(0, 4).map((stage) => {
        const deal = DEMO.find((d) => d.stage === stage);
        const s = STAGE_STYLES[stage];
        return (
          <div key={stage} className="rounded-xl border border-slate-200 bg-white/70 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {stage}
            </div>
            {deal && (
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                <div className="text-[13px] font-medium leading-tight">{deal.name}</div>
                <div className="mt-1 font-mono text-xs text-emerald-700">{money(deal.value)}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Feature({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

export default function Landing() {
  return (
    <div>
      <Navbar />

      <section className="mx-auto max-w-6xl px-5 pt-16 pb-10">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Built for one-person sales teams
        </p>
        <h1 className="max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Your whole pipeline, on one screen.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
          Track contacts and deals, move them stage by stage, and let AI draft the
          follow-up so the next step is never the thing that stalls a sale.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/signup" className={btnPrimary + " px-5 py-2.5 text-base"}>
            Start free
          </Link>
          <Link to="/pricing" className={btnGhost + " px-5 py-2.5 text-base"}>
            See pricing
          </Link>
        </div>

        <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
          <MiniBoard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature title="Contacts that stay yours">
            Every contact and note is tied to your account and saved to a real database —
            reload, log back in, it's all still here.
          </Feature>
          <Feature title="A pipeline you can move">
            Five stages from Lead to Won. Drag a deal forward with a tap and watch the
            board reflect exactly where every opportunity stands.
          </Feature>
          <Feature title="AI writes the follow-up">
            One click turns a deal's context into a ready-to-send email and a recommended
            next step. Stop staring at a blank reply box.
          </Feature>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="rounded-3xl border border-slate-200 bg-ink px-6 py-12 text-paper sm:px-12">
          <h2 className="font-display text-3xl font-semibold">Two plans. No sales call.</h2>
          <p className="mt-2 max-w-lg text-slate-300">
            Start free with up to 10 contacts and 3 AI drafts a day. Go Pro when your
            pipeline outgrows it.
          </p>
          <Link
            to="/pricing"
            className="mt-6 inline-flex rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-white hover:bg-emerald-400"
          >
            Compare plans
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl border-t border-slate-200 px-5 py-10 text-sm text-slate-400">
        © 2026 SoloCRM · The CRM for one-person sales teams.
      </footer>
    </div>
  );
}
