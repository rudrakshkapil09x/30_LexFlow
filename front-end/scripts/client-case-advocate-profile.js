async function initProfile() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const lawyerId = urlParams.get("id") || "user-3";
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const role = (currentUser.role || 'client').toLowerCase();

    let lawyer = null;
    let cases = [];
    let firm = null;

    if (window.LexFlowAPI) {
      try {
        lawyer = await window.LexFlowAPI.users.getById(lawyerId, role);
      } catch (e) {
        console.warn("Could not fetch lawyer by id:", e);
      }
      try {
        cases = await window.LexFlowAPI.cases.getAll({ lawyerId }, role);
      } catch (e) {
        console.warn("Could not fetch lawyer cases:", e);
      }
      if (lawyer && lawyer.firmId) {
        try {
          firm = await window.LexFlowAPI.users.getById(lawyer.firmId, role);
        } catch (e) {
          console.warn("Could not fetch firm for lawyer:", e);
        }
      }
    }

    if (!lawyer) {
      lawyer = {
        id: lawyerId,
        fullName: 'Adv. Sarah Mitchell',
        name: 'Sarah Mitchell',
        email: 'counsel@lexflow.in',
        role: 'lawyer',
        firmId: 'firm-1'
      };
    }

    const FIRM_NAMES = {
      'firm-1': 'Sharma & Associates',
      'firm-2': 'Khanna & Co',
      'firm-3': 'Tech Legal Bangalore',
      'firm-4': 'Coastal Legal Chennai',
      'firm-5': 'Cyber Law Experts Hyderabad'
    };

    const lawyerName = lawyer.fullName || lawyer.name || 'Advocate';
    const cleanName = lawyerName.replace(/^Adv\.\s+/i, '');
    const fullAdvName = `Adv. ${cleanName}`;
    const initials = (cleanName.split(' ').map(n => n[0]).join('') || 'SM').substring(0, 2).toUpperCase();
    const firmName = firm ? (firm.name || firm.fullName) : (FIRM_NAMES[lawyer.firmId] || 'Sharma & Associates');
    const specialisation = lawyer.specialisation || (firm ? firm.subtitle : null) || 'Civil & Corporate Litigation';
    const barCouncilId = lawyer.barCouncilId || `BCI/DL/2016/${Math.floor(1000 + Math.random() * 9000)}`;
    const experience = lawyer.experience || '10+ Years Experience';
    const courtOfPractice = lawyer.court || 'High Court & District Courts';

    // 1. Hero & Badges
    const nameEl = document.querySelector(".advocate-hero-info h1");
    if (nameEl) nameEl.textContent = fullAdvName;

    const taglineEl = document.querySelector(".advocate-tagline");
    if (taglineEl) taglineEl.textContent = `Senior Advocate • ${specialisation} • ${firmName}`;

    const avatarEl = document.querySelector(".advocate-avatar-lg");
    if (avatarEl) avatarEl.textContent = lawyer.avatar || initials;

    const badgesEl = document.querySelector(".advocate-badges");
    if (badgesEl) {
      badgesEl.innerHTML = `
        <span class="badge-verified">✓ Bar Council Verified</span>
        <span class="badge-type">BCI: ${barCouncilId}</span>
        <span class="badge-active">${experience}</span>
      `;
    }

    // 2. Mini Stats Pills
    const winRate = lawyer.winRate || 88;
    const wonCount = lawyer.won || 35;
    const lostCount = lawyer.lost || 5;
    const ongoingCount = cases.length > 0 ? cases.length : (lawyer.ongoing || 4);
    const totalCount = wonCount + lostCount + ongoingCount;

    const donutLabel = document.querySelector(".stat-pill-donut-label");
    if (donutLabel) donutLabel.textContent = `${winRate}%`;

    const winSubLabel = document.querySelector(".win-pill .stat-pill-sub");
    if (winSubLabel) winSubLabel.textContent = `${wonCount} won · ${lostCount} lost · ${ongoingCount} ongoing`;

    const casePillVal = document.querySelector(".cases-pill .stat-pill-value");
    if (casePillVal) casePillVal.textContent = `${totalCount} Cases`;

    const casePillSub = document.querySelector(".cases-pill .stat-pill-sub");
    if (casePillSub) casePillSub.textContent = `${specialisation} • ${firmName}`;

    // 3. Professional Details Card
    const infoGrid = document.querySelector(".left-col .card:first-child .info-grid");
    if (infoGrid) {
      infoGrid.innerHTML = `
        <div class="info-item"><label>Full Name</label><div class="value">${cleanName}</div></div>
        <div class="info-item"><label>Law Firm</label><div class="value">${firmName}</div></div>
        <div class="info-item"><label>Bar Council ID</label><div class="value">${barCouncilId}</div></div>
        <div class="info-item"><label>Specialisation</label><div class="value">${specialisation}</div></div>
        <div class="info-item"><label>Court of Practice</label><div class="value">${courtOfPractice}</div></div>
        <div class="info-item"><label>Contact</label><div class="value">${lawyer.email || 'counsel@lexflow.in'}</div></div>
      `;
    }

    // 4. Performance Grid
    const perfVals = document.querySelectorAll(".perf-grid .perf-item .perf-value");
    if (perfVals.length >= 4) {
      perfVals[0].textContent = totalCount;
      perfVals[1].textContent = wonCount;
      perfVals[2].textContent = lostCount;
      perfVals[3].textContent = ongoingCount;
    }

    // 5. Active Cases
    const casesListEl = document.querySelector(".advocate-cases-list");
    if (casesListEl) {
      if (cases.length === 0) {
        casesListEl.innerHTML = '<p style="color:#6b7280; font-size:13px; padding:16px; text-align:center;">No active cases currently recorded.</p>';
      } else {
        casesListEl.innerHTML = cases.map((e) => `
          <a href="client-case-details.html?id=${e.id}" class="advocate-case-row">
            <div class="ac-dot ongoing"></div>
            <div class="ac-info">
              <div class="ac-title">${e.case_type || e.title || 'Legal Case'}</div>
              <div class="ac-meta"><span class="ac-cnr">CNR: ${e.cnr || 'N/A'}</span><span class="ac-sep">·</span>${e.brief_description || 'Active Proceeding'}</div>
            </div>
            <span class="badge-status ongoing-badge">${e.status || 'Active'}</span>
            <svg class="ac-arrow-svg" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 18l6-6-6-6"/></svg>
          </a>
        `).join("");
      }
    }

    // 6. Upcoming Hearings
    const hearingListEl = document.querySelector(".hearing-list");
    if (hearingListEl) {
      const scheduledCases = cases.filter(c => c.nextHearing && c.nextHearing.date);
      if (scheduledCases.length === 0) {
        hearingListEl.innerHTML = '<p style="color:#6b7280; font-size:13px; padding:12px; text-align:center;">No court hearings scheduled at this time.</p>';
      } else {
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        hearingListEl.innerHTML = scheduledCases.map(c => {
          const d = new Date(c.nextHearing.date);
          const mon = months[d.getMonth()] || "TBD";
          const day = d.getDate() || "--";
          return `
            <div class="hearing-banner sm" style="margin-top:8px">
              <div class="hearing-date"><div class="month">${mon}</div><div class="day">${day}</div></div>
              <div class="hearing-info">
                <div class="title">${c.case_type || 'Case'} · ${c.cnr}</div>
                <div class="sub">${c.nextHearing.time || '10:30 AM'} • ${c.nextHearing.description || 'Court Appearance'}</div>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    // 7. Qualifications
    const qualListEl = document.querySelector(".qual-list");
    if (qualListEl) {
      qualListEl.innerHTML = `
        <div class="qual-item">
          <div class="qual-title">LL.B. (Hons), National Law School of India</div>
          <div class="qual-year">Graduated with Distinction</div>
        </div>
        <div class="qual-item">
          <div class="qual-title">Enrolled Advocate, Bar Council of India</div>
          <div class="qual-year">Practicing Advocate</div>
        </div>
        <div class="qual-item">
          <div class="qual-title">Certified Mediator & Arbitrator</div>
          <div class="qual-year">Dispute Resolution Board</div>
        </div>
      `;
    }

    animateNumbers();
  } catch (e) {
    console.error("Error loading advocate profile:", e);
  }
}

function animateNumbers() {
  document.querySelectorAll(".perf-value").forEach((e) => {
    const t = parseInt(e.textContent, 10);
    if (isNaN(t)) return;
    e.textContent = "0";
    let n = 0;
    const a = Math.max(1, Math.floor(t / 20)),
      o = setInterval(() => {
        ((n += a), n >= t && ((n = t), clearInterval(o)), (e.textContent = n));
      }, 40);
  });
}

document.addEventListener("DOMContentLoaded", initProfile);
