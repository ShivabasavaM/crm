import { createContext, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, setToken, getToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!getToken()) {
      setAccount(null);
      setLoading(false);
      return;
    }
    try {
      const a = await api.account();
      setAccount(a);
    } catch {
      setToken(null);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const { access_token } = await api.login(email, password);
    setToken(access_token);
    await refresh();
  }

  async function signup(email, password) {
    const { access_token } = await api.signup(email, password);
    setToken(access_token);
    await refresh();
  }

  function logout() {
    setToken(null);
    setAccount(null);
  }

  return (
    <AuthContext.Provider value={{ account, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function ProtectedRoute({ children }) {
  const { account, loading } = useAuth();
  if (loading)
    return <div className="p-16 text-center text-slate-400 font-body">Loading…</div>;
  if (!account) return <Navigate to="/login" replace />;
  return children;
}
