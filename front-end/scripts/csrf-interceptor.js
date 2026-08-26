/**
 * csrf-interceptor.js
 *
 * Loaded in the <head> of every HTML page.
 * Patches window.fetch to automatically:
 *  1. Send credentials (cookies) on all backend requests.
 *  2. Include the X-CSRF-Token header on mutating requests (POST/PUT/PATCH/DELETE).
 *
 * The CSRF token is fetched once from GET /api/csrf-token on page load.
 * Because this patches window.fetch globally, ALL scripts on the page
 * benefit — no per-page changes needed.
 */
(function () {
  'use strict';

  const BASE_URL = 'http://localhost:3000';
  const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];
  let csrfToken = null;

  // ── Fetch token on page load ────────────────────────────────────────────────
  window
    .fetch(BASE_URL + '/api/csrf-token', { credentials: 'include' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.success && d.csrfToken) {
        csrfToken = d.csrfToken;
      }
    })
    .catch(function (e) {
      console.warn('[CSRF] Could not fetch token:', e.message);
    });

  // ── Patch window.fetch ──────────────────────────────────────────────────────
  var _originalFetch = window.fetch;

  window.fetch = function (resource, init) {
    init = init || {};

    var url = typeof resource === 'string' ? resource : resource.url;
    var isBackend = url && url.indexOf('localhost:3000') !== -1;

    if (isBackend) {
      // Always include credentials so the CSRF cookie is sent back
      init.credentials = 'include';

      var method = (init.method || 'GET').toUpperCase();
      if (MUTATING.indexOf(method) !== -1 && csrfToken) {
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
          init.headers.set('X-CSRF-Token', csrfToken);
        } else {
          init.headers['X-CSRF-Token'] = csrfToken;
        }
      }
    }

    return _originalFetch.call(this, resource, init);
  };
})();
