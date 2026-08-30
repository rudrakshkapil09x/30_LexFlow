/* =========================================================
   LexFlow — Landing Page Script
   ========================================================= */

(function () {
  'use strict';

  function getSignInPath() {
    return window.location.pathname.includes('/pages/') ? './sign-in.html' : './pages/sign-in.html';
  }

  /* ---- Helper: generic dropdown toggle ---- */
  function makeDropdown(btnId, dropdownId, anchorId) {
    const btn      = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    const anchor   = document.getElementById(anchorId);
    if (!btn || !dropdown || !anchor) return { btn, dropdown, anchor };

    function open() {
      dropdown.classList.add('is-open');
      btn.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      dropdown.classList.remove('is-open');
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
    function toggle() {
      dropdown.classList.contains('is-open') ? close() : open();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });

    return { btn, dropdown, anchor, open, close };
  }

  /* ---- Close all dropdowns when clicking outside ---- */
  const allAnchors = [];

  document.addEventListener('click', function (e) {
    allAnchors.forEach(function (a) {
      if (!a.anchor.contains(e.target)) a.close();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') allAnchors.forEach(function (a) { a.close(); });
  });

  /* ================================================================
     1. LOGIN DROPDOWN
     ================================================================ */
  const login = makeDropdown('login-btn', 'login-dropdown', 'login-anchor');
  if (login.close) allAnchors.push(login);

  const loginClientBtn  = document.getElementById('login-client-btn');
  const loginLawfirmBtn = document.getElementById('login-lawfirm-btn');
  const loginInternBtn = document.getElementById('login-intern-btn');

  if (loginClientBtn) {
    loginClientBtn.addEventListener('click', function () {
      localStorage.setItem('loginRole', 'client');
      login.close();
      window.location.href = getSignInPath();
    });
  }

  if (loginLawfirmBtn) {
    loginLawfirmBtn.addEventListener('click', function () {
      localStorage.setItem('loginRole', 'firmadmin');
      login.close();
      window.location.href = getSignInPath();
    });
  }

  if (loginInternBtn) {
    loginInternBtn.addEventListener('click', function () {
      localStorage.setItem('loginRole', 'intern');
      login.close();
      window.location.href = getSignInPath();
    });
  }

  /* ================================================================
     3. REQUEST CONSULTATION CTA (LOGIN REQUIRED)
     ================================================================ */
  const requestConsultationBtn = document.getElementById('request-consultation-btn');
  if (requestConsultationBtn) {
    requestConsultationBtn.addEventListener('click', function () {
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        window.location.href = './pages/client-consultation-dashboard.html';
        return;
      }

      const shouldLogin = window.confirm('Please login first to request a consultation. Go to Sign In now?');
      if (shouldLogin) {
        window.location.href = getSignInPath();
      }
    });
  }

  const registerLawFirmBtn = document.getElementById('register-law-firm-btn');
  if (registerLawFirmBtn) {
    registerLawFirmBtn.addEventListener('click', function () {
      window.location.href = getOnboardingPath();
    });
  }

  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      window.alert('Thanks for subscribing to the LexFlow newsletter!');
      newsletterForm.reset();
    });
  }

  /* ================================================================
     2. LANGUAGE DROPDOWN
     ================================================================ */
  const lang = makeDropdown('lang-btn', 'lang-dropdown', 'lang-anchor');
  if (lang.close) allAnchors.push(lang);

  const langLabel   = document.getElementById('lang-label');
  const langOptions = document.querySelectorAll('#lang-dropdown .nav-dropdown__item');

  langOptions.forEach(function (optBtn) {
    optBtn.addEventListener('click', function () {
      // Update active state
      langOptions.forEach(function (b) { b.classList.remove('is-active'); });
      optBtn.classList.add('is-active');

      // Update button label (EN / HI)
      if (langLabel) langLabel.textContent = optBtn.dataset.label;

      lang.close();
    });
  });

  /* ================================================================
     4. PRICING CTA BUTTONS → open payment modal
     ================================================================ */

  function getOnboardingPath() {
    return window.location.pathname.includes('/pages/')
      ? './lawfirm-onboarding-step-1.html'
      : './pages/lawfirm-onboarding-step-1.html';
  }

  function openPayModal() {
    var backdrop = document.getElementById('pay-modal-backdrop');
    if (!backdrop) return;
    backdrop.hidden = false;
    // Force reflow so the transition fires
    backdrop.offsetHeight; // eslint-disable-line no-unused-expressions
    backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    // Focus the first input
    var firstInput = backdrop.querySelector('.pay-input');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 260);
  }

  function closePayModal() {
    var backdrop = document.getElementById('pay-modal-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { backdrop.hidden = true; }, 240);
    // Reset to form state
    showPayState('body');
    resetPayForms();
  }

  var pricingStarterBtn = document.getElementById('pricing-starter-btn');
  if (pricingStarterBtn) pricingStarterBtn.addEventListener('click', openPayModal);

  var pricingGrowthBtn = document.getElementById('pricing-growth-btn');
  if (pricingGrowthBtn) pricingGrowthBtn.addEventListener('click', openPayModal);

  // Enterprise scrolls to footer (no payment modal — custom contract flow)
  var pricingEnterpriseBtn = document.getElementById('pricing-enterprise-btn');
  if (pricingEnterpriseBtn) {
    pricingEnterpriseBtn.addEventListener('click', function () {
      var footer = document.querySelector('.footer');
      if (footer) {
        footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(function () {
          var emailInput = document.querySelector('.newsletter-input');
          if (emailInput) emailInput.focus();
        }, 600);
      }
    });
  }

  /* ================================================================
     5. PAYMENT MODAL CONTROLLER
     ================================================================ */

  var payBackdrop = document.getElementById('pay-modal-backdrop');
  var payCloseBtn = document.getElementById('pay-modal-close');

  // Close on backdrop click (outside modal box)
  if (payBackdrop) {
    payBackdrop.addEventListener('click', function (e) {
      if (e.target === payBackdrop) closePayModal();
    });
  }
  if (payCloseBtn) payCloseBtn.addEventListener('click', closePayModal);

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && payBackdrop && !payBackdrop.hidden) closePayModal();
  });

  /* ---- State switcher ---- */
  function showPayState(which) {
    var body       = document.getElementById('pay-modal-body');
    var processing = document.getElementById('pay-processing');
    var success    = document.getElementById('pay-success');
    if (!body || !processing || !success) return;
    body.style.display       = which === 'body'       ? '' : 'none';
    processing.classList[which === 'processing' ? 'remove' : 'add']('pay-modal__state--hidden');
    success.classList[which === 'success'       ? 'remove' : 'add']('pay-modal__state--hidden');
  }

  /* ---- Tab switching ---- */
  var tabs   = document.querySelectorAll('.pay-tab');
  var panels = document.querySelectorAll('.pay-panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('aria-controls');
      tabs.forEach(function (t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach(function (p) { p.classList.add('pay-panel--hidden'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      var panel = document.getElementById(target);
      if (panel) panel.classList.remove('pay-panel--hidden');
    });
  });

  /* ---- Card number formatting (spaces every 4 digits) ---- */
  var cardNumberInput = document.getElementById('card-number');
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', function () {
      var raw = cardNumberInput.value.replace(/\D/g, '').slice(0, 16);
      var formatted = raw.match(/.{1,4}/g);
      cardNumberInput.value = formatted ? formatted.join(' ') : raw;
    });
  }

  /* ---- Expiry formatting (MM / YY) ---- */
  var cardExpiryInput = document.getElementById('card-expiry');
  if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', function () {
      var raw = cardExpiryInput.value.replace(/\D/g, '').slice(0, 4);
      if (raw.length >= 3) {
        cardExpiryInput.value = raw.slice(0, 2) + ' / ' + raw.slice(2);
      } else {
        cardExpiryInput.value = raw;
      }
    });
  }

  /* ---- CVV: digits only ---- */
  var cardCvvInput = document.getElementById('card-cvv');
  if (cardCvvInput) {
    cardCvvInput.addEventListener('input', function () {
      cardCvvInput.value = cardCvvInput.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  /* ---- Mock processing flow ---- */
  function runMockPayment() {
    showPayState('processing');
    setTimeout(function () {
      showPayState('success');
      // Redirect after 2.2 s so user can see the success screen
      setTimeout(function () {
        closePayModal();
        window.location.href = getOnboardingPath();
      }, 2200);
    }, 2000); // simulate 2 s network round-trip
  }

  /* ---- Form validation helpers ---- */
  function showError(errorId, msg) {
    var el = document.getElementById(errorId);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }
  function clearError(errorId) {
    var el = document.getElementById(errorId);
    if (el) el.hidden = true;
  }

  function resetPayForms() {
    ['pay-card-form', 'pay-upi-form', 'pay-nb-form'].forEach(function (id) {
      var form = document.getElementById(id);
      if (form) form.reset();
    });
    ['card-error', 'upi-error', 'nb-error'].forEach(clearError);
    // Reset tabs to Card
    tabs.forEach(function (t) {
      t.classList.remove('is-active');
      t.setAttribute('aria-selected', 'false');
    });
    panels.forEach(function (p) { p.classList.add('pay-panel--hidden'); });
    var cardTab   = document.getElementById('tab-card');
    var cardPanel = document.getElementById('panel-card');
    if (cardTab)   { cardTab.classList.add('is-active'); cardTab.setAttribute('aria-selected', 'true'); }
    if (cardPanel) cardPanel.classList.remove('pay-panel--hidden');
  }

  /* ---- Card form submission ---- */
  var cardForm = document.getElementById('pay-card-form');
  if (cardForm) {
    cardForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError('card-error');
      var name   = (document.getElementById('card-name')   || {}).value || '';
      var number = (document.getElementById('card-number') || {}).value || '';
      var expiry = (document.getElementById('card-expiry') || {}).value || '';
      var cvv    = (document.getElementById('card-cvv')    || {}).value || '';

      if (!name.trim()) {
        return showError('card-error', 'Please enter the cardholder name.');
      }
      if (number.replace(/\s/g, '').length < 16) {
        return showError('card-error', 'Please enter a valid 16-digit card number.');
      }
      if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry.trim())) {
        return showError('card-error', 'Please enter a valid expiry date (MM / YY).');
      }
      if (cvv.length < 3) {
        return showError('card-error', 'Please enter a valid CVV (3–4 digits).');
      }
      runMockPayment();
    });
  }

  /* ---- UPI form submission ---- */
  var upiForm = document.getElementById('pay-upi-form');
  if (upiForm) {
    upiForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError('upi-error');
      var upiId = (document.getElementById('upi-id') || {}).value || '';
      if (!upiId.trim() || !upiId.includes('@')) {
        return showError('upi-error', 'Please enter a valid UPI ID (e.g. name@upi).');
      }
      runMockPayment();
    });
  }

  /* ---- Net Banking form submission ---- */
  var nbForm = document.getElementById('pay-nb-form');
  if (nbForm) {
    nbForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError('nb-error');
      var bank = (document.getElementById('nb-bank') || {}).value || '';
      if (!bank) {
        return showError('nb-error', 'Please select your bank to continue.');
      }
      runMockPayment();
    });
  }

})();

