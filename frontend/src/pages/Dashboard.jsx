import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import UsageBar from "../components/UsageBar";
import ContactsPanel from "../components/ContactsPanel";
import PipelineBoard from "../components/PipelineBoard";
import AiPanel from "../components/AiPanel";
import UpgradeModal from "../components/UpgradeModal";
import { api } from "../api";
import { useAuth } from "../auth";
import { openRazorpayCheckout } from "../lib/razorpay";

export default function Dashboard() {
  const { refresh } = useAuth();
  const [acct, setAcct] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [params, setParams] = useSearchParams();
  const [banner, setBanner] = useState(
    params.get("upgraded") ? "You're on Pro now — everything's unlocked." : ""
  );
  const [showUpgrade, setShowUpgrade] = useState(false);

  const reload = useCallback(async () => {
    const [a, c, d, dr] = await Promise.all([
      api.account(),
      api.listContacts(),
      api.listDeals(),
      api.listDrafts(),
    ]);
    setAcct(a);
    setContacts(c);
    setDeals(d);
    setDrafts(dr);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Coming back from a successful checkout redirect (kept for safety).
  useEffect(() => {
    if (params.get("upgraded")) {
      refresh();
      params.delete("upgraded");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show the Pro modal once per browser session, only to free users.
  useEffect(() => {
    if (acct && acct.plan === "free" && !sessionStorage.getItem("upgrade_seen")) {
      setShowUpgrade(true);
      sessionStorage.setItem("upgrade_seen", "1");
    }
  }, [acct]);

  // Central upgrade flow: create order -> Razorpay popup -> verify -> reload.
  const upgrade = useCallback(async () => {
    try {
      const order = await api.checkout();
      await openRazorpayCheckout(order, {
        onSuccess: async (resp) => {
          try {
            await api.verifyPayment(resp);
            await reload();
            await refresh();
            setBanner("You're on Pro now — everything's unlocked.");
          } catch (e) {
            alert(e.message || "Payment verification failed");
          }
        },
      });
    } catch (e) {
      alert(e.message || "Could not start checkout");
    }
  }, [reload, refresh]);

  const createContact = async (data) => {
    await api.createContact(data);
    await reload();
  };
  const updateContact = async (id, data) => {
    await api.updateContact(id, data);
    await reload();
  };
  const deleteContact = async (id) => {
    await api.deleteContact(id);
    await reload();
  };
  const createDeal = async (data) => {
    await api.createDeal(data);
    await reload();
  };
  const updateDeal = async (id, data) => {
    await api.updateDeal(id, data);
    await reload();
  };
  const deleteDeal = async (id) => {
    await api.deleteDeal(id);
    await reload();
  };
  const generate = async (dealId, instructions) => {
    const draft = await api.followUp(dealId, instructions);
    await reload();
    return draft;
  };

  return (
    <div>
      <Navbar />
      <UpgradeModal open={showUpgrade} onUpgrade={upgrade} onClose={() => setShowUpgrade(false)} />

      <main className="mx-auto max-w-6xl space-y-5 px-5 py-8">
        {banner && (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
            {banner}
            <button onClick={() => setBanner("")} className="text-emerald-600 hover:text-emerald-800">
              ✕
            </button>
          </div>
        )}

        <UsageBar account={acct} />

        <PipelineBoard
          deals={deals}
          contacts={contacts}
          onCreate={createDeal}
          onUpdate={updateDeal}
          onDelete={deleteDeal}
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <ContactsPanel
            contacts={contacts}
            onCreate={createContact}
            onUpdate={updateContact}
            onDelete={deleteContact}
            onUpgrade={upgrade}
          />
          <AiPanel deals={deals} drafts={drafts} account={acct} onGenerate={generate} onUpgrade={upgrade} />
        </div>
      </main>
    </div>
  );
}