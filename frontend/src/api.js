const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(t) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (data && data.detail) detail = data.detail;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(typeof detail === "string" ? detail : "Request failed");
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (email, password) =>
    request("/auth/signup", { method: "POST", body: { email, password }, auth: false }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password }, auth: false }),

  account: () => request("/account"),

  listContacts: () => request("/contacts"),
  createContact: (data) => request("/contacts", { method: "POST", body: data }),
  updateContact: (id, data) => request(`/contacts/${id}`, { method: "PATCH", body: data }),
  deleteContact: (id) => request(`/contacts/${id}`, { method: "DELETE" }),

  listDeals: () => request("/deals"),
  createDeal: (data) => request("/deals", { method: "POST", body: data }),
  updateDeal: (id, data) => request(`/deals/${id}`, { method: "PATCH", body: data }),
  deleteDeal: (id) => request(`/deals/${id}`, { method: "DELETE" }),

  followUp: (deal_id) => request("/ai/follow-up", { method: "POST", body: { deal_id } }),
  listDrafts: () => request("/ai/drafts"),

  // Billing (Razorpay)
  checkout: () => request("/billing/checkout", { method: "POST" }),
  verifyPayment: (payload) => request("/billing/verify", { method: "POST", body: payload }),
  downgrade: () => request("/billing/downgrade", { method: "POST" }),
};
