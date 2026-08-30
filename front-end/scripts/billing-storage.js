(function () {

  const BASE = "http://localhost:3000";

  function getCurrentUser() {
    try {
      const raw =
        sessionStorage.getItem("currentUser") ||
        localStorage.getItem("currentUser");

      if (!raw) return {};
      return JSON.parse(raw);

    } catch {
      return {};
    }
  }

  function getHeaders(extra = {}) {
    const user = getCurrentUser();
    const userRole = (user.role || window.LEXFLOW_ROLE || "firmadmin").toLowerCase();

    return {
      "Content-Type": "application/json",
      role: userRole,
      "x-user-id": user.id || "",
      "x-user-name": user.fullName || user.name || "",
      ...extra,
    };
  }

  let _cachedCsrfToken = null;

  async function getCsrfToken() {
    if (window.LexFlowAPI && window.LexFlowAPI.getCsrfToken) {
      try {
        const t = await window.LexFlowAPI.getCsrfToken();
        if (t) return t;
      } catch {}
    }
    if (_cachedCsrfToken) return _cachedCsrfToken;
    try {
      const res = await fetch(`${BASE}/api/csrf-token`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        _cachedCsrfToken = data.csrfToken || data.token;
        return _cachedCsrfToken;
      }
    } catch (e) {
      console.warn("[billing-storage] Failed to fetch CSRF token:", e);
    }
    return null;
  }

  async function apiFetch(path, options = {}) {
    const headers = getHeaders(options.headers || {});
    
    // Inject CSRF token for mutating requests
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      const token = await getCsrfToken();
      if (token) headers['x-csrf-token'] = token;
    }

    const res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      ...options,
      headers,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        json?.message ||
        (Array.isArray(json?.errors) ? json.errors.join(", ") : null) ||
        `HTTP ${res.status}`;

      throw new Error(msg);
    }

    return json.data ?? json;
  }

  // ── CLIENTS ─────────────────────────────

  async function fetchClients() {
    return apiFetch("/billing/clients");
  }

  // ── INVOICES ────────────────────────────

  async function fetchInvoices() {
    return apiFetch("/billing/invoices");
  }

  async function fetchSummary() {
    return apiFetch("/billing/invoices/summary");
  }

  async function fetchInvoice(id) {
    return apiFetch(`/billing/invoices/${id}`);
  }

  async function createInvoice(dto) {
    return apiFetch("/billing/invoices", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async function updateInvoice(id, dto) {
    return apiFetch(`/billing/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }

  async function deleteInvoice(id) {
    return apiFetch(`/billing/invoices/${id}`, {
      method: "DELETE",
    });
  }

  // ── PAYMENTS ────────────────────────────

  async function fetchPayments() {
    return apiFetch("/billing/payments");
  }

  async function fetchPaymentsByInvoice(id) {
    return apiFetch(`/billing/payments/invoice/${id}`);
  }

  async function recordPayment(invoiceId, paymentMethod) {
    return apiFetch(`/billing/payments/${invoiceId}`, {
      method: "POST",
      body: JSON.stringify({ paymentMethod }),
    });
  }

  window.LexFlowBillingStorage = {
    fetchClients,
    fetchInvoices,
    fetchSummary,
    fetchInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    fetchPayments,
    fetchPaymentsByInvoice,
    recordPayment,
  };

})();