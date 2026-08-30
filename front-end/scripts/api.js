/**
 * LexFlow API Service
 * Central HTTP client for all backend calls.
 * Base URL: http://localhost:3000
 *
 * Usage:
 *   const cons = await LexFlowAPI.consultations.getMy(clientId, role);
 *   const created = await LexFlowAPI.consultations.create(data, role);
 */

const LexFlowAPI = (() => {
  'use strict';

  const BASE_URL = 'http://localhost:3000';

  let cachedCsrfToken = null;

  async function fetchCsrfToken() {
    try {
      const res = await fetch(`${BASE_URL}/api/csrf-token`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        cachedCsrfToken = data.csrfToken || data.token || null;
      }
    } catch (e) {
      console.warn('Could not fetch CSRF token', e);
    }
    return cachedCsrfToken;
  }

  /**
   * Core fetch wrapper — injects role + content-type headers,
   * throws a structured error on non-2xx responses.
   */
  async function request(method, path, { body, role, extraHeaders = {}, isRetry = false } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (role) headers['role'] = role;

    const isMutating = method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD';
    if (isMutating) {
      if (!cachedCsrfToken) {
        await fetchCsrfToken();
      }
      if (cachedCsrfToken) {
        headers['x-csrf-token'] = cachedCsrfToken;
      }
    }

    // If body is FormData, do NOT stringify and do NOT set Content-Type
    // The browser will automatically set Content-Type with the correct boundary
    const opts = { method, headers, credentials: 'include' };
    if (body !== undefined) {
      if (body instanceof FormData) {
        opts.body = body;
        delete headers['Content-Type'];
      } else {
        opts.body = JSON.stringify(body);
      }
    }

    let res = await fetch(`${BASE_URL}${path}`, opts);

    // If CSRF token expired or invalid, fetch a new one and retry once
    if (res.status === 403 && isMutating && !isRetry) {
      cachedCsrfToken = null;
      await fetchCsrfToken();
      return request(method, path, { body, role, extraHeaders, isRetry: true });
    }

    // Parse body (may be empty for 204)
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      const message =
        data?.message ||
        (Array.isArray(data?.message) ? data.message.join(', ') : null) ||
        `HTTP ${res.status}`;
      const err = new Error(Array.isArray(message) ? message.join(', ') : message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // ── Helper to get current user & role from localStorage ──────────────────
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch {
      return null;
    }
  }

  function getRole() {
    const user = getCurrentUser();
    return user?.role || null;
  }

  // ── Consultations namespace ───────────────────────────────────────────────
  const consultations = {
    /**
     * GET /consultations/my
     * Client: fetch own consultations
     * @param {string} clientId  - The current client's user ID
     * @param {string} role      - Should be "client"
     */
    getMy(clientId, role) {
      return request('GET', '/consultations/my', {
        role,
        extraHeaders: { 'x-client-id': clientId },
      });
    },

    /**
     * GET /consultations
     * FirmAdmin/Lawyer: fetch all with optional filters
     * @param {{ clientId?, firmId?, status?, lawyerId? }} filters
     * @param {string} role
     */
    getAll(filters = {}, role) {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { 
        if (v !== undefined && v !== null) qs.set(k, v); 
      });
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return request('GET', `/consultations${query}`, { role });
    },

    /**
     * GET /consultations/:id
     * All roles
     */
    getById(id, role) {
      return request('GET', `/consultations/${id}`, { role });
    },

    /**
     * POST /consultations
     * Client creates a new booking
     * @param {Object} data  - CreateConsultationDto shape
     * @param {string} role  - "client"
     */
    create(data, role) {
      return request('POST', '/consultations', { body: data, role });
    },

    /**
     * PATCH /consultations/:id
     * FirmAdmin/Lawyer: assign lawyer, change status, add notes
     */
    update(id, data, role) {
      return request('PATCH', `/consultations/${id}`, { body: data, role });
    },

    /**
     * PATCH /consultations/:id/cancel
     * Client or FirmAdmin: cancel a consultation
     */
    cancel(id, role) {
      return request('PATCH', `/consultations/${id}/cancel`, { role });
    },

    /**
     * DELETE /consultations/:id
     * FirmAdmin/SuperAdmin only
     */
    remove(id, role) {
      return request('DELETE', `/consultations/${id}`, { role });
    },

    /**
     * GET /consultations/workflow-bookings
     * FirmAdmin/SuperAdmin: who booked via the search workflow
     */
    getWorkflowBookings(role) {
      return request('GET', '/consultations/workflow-bookings', { role });
    },
  };

  // ── Users namespace (for any cross-module needs) ──────────────────────────
  const users = {
    getAll(filters = {}, role) {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { 
        if (v !== undefined && v !== null) qs.set(k, v); 
      });
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return request('GET', `/users${query}`, { role });
    },
    getAllFirms(role) {
      return request('GET', '/users/firms/all', { role });
    },
    getById(id, role) {
      return request('GET', `/users/${id}`, { role });
    },
    getLawyers(firmId, role) {
      const query = firmId ? `?firmId=${firmId}` : '';
      return request('GET', `/users/lawyers${query}`, { role });
    },
  };



  // ── Cases namespace ──────────────────────────────────────────────────────────
  const cases = {
    getAll(filters = {}, role) {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { 
        if (v !== undefined && v !== null) qs.set(k, v); 
      });
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return request('GET', `/cases${query}`, { role });
    },
    getById(id, role) {
      return request('GET', `/cases/${id}`, { role });
    },
    create(data, role) {
      return request('POST', '/cases', { body: data, role });
    },
    update(id, data, role) {
      return request('PATCH', `/cases/${id}`, { body: data, role });
    },
    remove(id, role) {
      return request('DELETE', `/cases/${id}`, { role });
    },
  };

  // ── Tasks namespace ───────────────────────────────────────────────────────
  const tasks = {
    getAll(filters = {}, role) {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { 
        if (v !== undefined && v !== null) qs.set(k, v); 
      });
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return request('GET', `/tasks${query}`, { role });
    },
    getById(id, role) {
      return request('GET', `/tasks/${id}`, { role });
    },
    create(data, role) {
      return request('POST', '/tasks', { body: data, role });
    },
    update(id, data, role) {
      return request('PATCH', `/tasks/${id}`, { body: data, role });
    },
    remove(id, role) {
      return request('DELETE', `/tasks/${id}`, { role });
    },
  };

  // ── Law Firms namespace ───────────────────────────────────────────────────
  const lawFirms = {
    /**
     * GET /law-firms
     * Client: search/filter law firms
     * @param {{ keyword?, location?, practiceArea?, sortBy? }} filters
     * @param {string} role - should be "client"
     */
    getAll(filters = {}, role) {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { 
        if (v !== undefined && v !== null) qs.set(k, v); 
      });
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return request('GET', `/law-firms${query}`, { role });
    },

    /**
     * GET /law-firms/:id
     * Client: get full profile of a single firm
     * @param {string} id - firm ID e.g. 'firm-001'
     * @param {string} role
     */
    getById(id, role) {
      return request('GET', `/law-firms/${id}`, { role });
    },
  };

  // ── Auth namespace ──────────────────────────────────────────────────────────
  const auth = {
    login(email, password, role) {
      return request('POST', '/users/login', { body: { email, password, role } });
    },
  };

  // Public interface
  return { 
    auth, consultations, users, cases, tasks, lawFirms, 
    getCurrentUser, getRole, BASE_URL,
    getCsrfToken: async () => {
      if (!cachedCsrfToken) await fetchCsrfToken();
      return cachedCsrfToken;
    },
    fetchCsrfToken
  };

})();

// Make globally available
window.LexFlowAPI = LexFlowAPI;

