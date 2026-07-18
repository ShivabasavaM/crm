import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../auth";
import { api } from "../api";
import { openRazorpayCheckout } from "../lib/razorpay";
import { btnPrimary, input } from "../ui";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }
    setBusy(true);
    try {
      await signup(email, password);
      // If they came from the Pro CTA, open checkout right after signup.
      if (params.get("next") === "pro") {
        const order = await api.checkout();
        await openRazorpayCheckout(order, {
          onSuccess: async (resp) => {
            try {
              await api.verifyPayment(resp);
              window.location.href = "/app?upgraded=1";
            } catch {
              window.location.href = "/app";
            }
          },
          onDismiss: () => navigate("/app"),
        });
        return;
      }
      navigate("/app");
    } catch (err) {
      setError(err.message || "Could not create account");
      setBusy(false);
    }
  }

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-md px-5 py-20">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Start your pipeline
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Free forever for your first 10 contacts.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className={btnPrimary + " w-full"}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
