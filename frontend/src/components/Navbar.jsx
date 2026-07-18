import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { btnPrimary } from "../ui";

export default function Navbar() {
  const { account, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-paper font-display text-sm">
            S
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">SoloCRM</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link to="/pricing" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            Pricing
          </Link>
          {account ? (
            <>
              <Link to="/app" className="rounded-lg px-3 py-2 hover:bg-slate-100">
                Pipeline
              </Link>
              <Link to="/account" className="rounded-lg px-3 py-2 hover:bg-slate-100">
                Account
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 hover:bg-slate-100">
                Log in
              </Link>
              <Link to="/signup" className={btnPrimary + " ml-1"}>
                Start free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
