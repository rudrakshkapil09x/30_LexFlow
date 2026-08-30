function formatDate(value) {
  if (!value) return "TBD";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderTimeline(timeline) {
  const timelineEl = document.querySelector(".timeline");
  if (!timelineEl) return;
  
  if (!Array.isArray(timeline) || timeline.length === 0) {
    timelineEl.innerHTML = '<div style="color:#6b7280; font-size:13px; padding:10px;">No timeline events recorded.</div>';
    return;
  }

  timelineEl.innerHTML = timeline
    .map(
      (event) => `
        <div class="timeline-item ${event.grey ? "grey" : ""}">
          <div class="t-title">${event.title}</div>
          <div class="t-date">${event.date}</div>
          ${event.upcoming ? '<span class="badge-upcoming">UPCOMING</span>' : ""}
          ${event.desc || event.note ? `<div class="t-note">${event.desc || event.note}</div>` : ""}
        </div>
      `,
    )
    .join("");
}

function renderDocuments(documents) {
  const docsBody = document.querySelector(".docs-table tbody");
  if (!docsBody) return;

  if (!Array.isArray(documents) || documents.length === 0) {
    docsBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#6b7280; padding: 20px;">No documents available for this case.</td></tr>';
    return;
  }

  docsBody.innerHTML = documents
    .map(
      (doc) => `
        <tr>
          <td><div class="doc-name"><div class="doc-icon ${String(doc.type || "DOC").toLowerCase()}">${(doc.type || "DOC").toUpperCase()}</div>${doc.name || 'Document'}</div></td>
          <td>${doc.date || doc.createdAt || "Today"}</td>
          <td><span class="badge-verified">${doc.status || "Verified"}</span></td>
          <td><button class="download-btn" data-file="${doc.name || 'document.pdf'}"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11"/></svg></button></td>
        </tr>
      `,
    )
    .join("");

  attachDownloadHandlers();
}

function attachDownloadHandlers() {
  document.querySelectorAll(".download-btn").forEach((button) => {
    button.onclick = function () {
      const fileName = this.dataset.file || "document.txt";
      const safeName = String(fileName).trim() || "document.txt";
      const fileContent = `LexFlow Document Export\nFile: ${safeName}\nGenerated: ${new Date().toISOString()}`;
      const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
    };
  });
}

async function initCaseDetails() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get("id");
    const cnrFromUrl = urlParams.get("cnr");

    const casesAPI = window.LexFlowAPI ? window.LexFlowAPI.cases : null;
    const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const currentUser = {
      role: (currentUserData.role || 'client').toLowerCase(),
      id: currentUserData.id || null,
      name: currentUserData.fullName || currentUserData.name || 'Client'
    };

    let currentCase = null;
    if (casesAPI) {
      if (idFromUrl) {
        try {
          currentCase = await casesAPI.getById(idFromUrl, currentUser.role);
        } catch (e) {
          console.warn("getById failed, attempting list lookup:", e);
        }
      }
      if (!currentCase) {
        const filters = {};
        if (currentUser.id) filters.clientId = currentUser.id;
        const all = await casesAPI.getAll(filters, currentUser.role);
        if (idFromUrl) {
          currentCase = all.find(c => String(c.id) === String(idFromUrl));
        } else if (cnrFromUrl) {
          currentCase = all.find(c => String(c.cnr) === String(cnrFromUrl));
        }
        if (!currentCase && !idFromUrl && !cnrFromUrl && all.length > 0) {
          currentCase = all[0];
        }
      }
    } else if (window.LexFlowCasesStorage) {
      if (idFromUrl) {
        currentCase = await window.LexFlowCasesStorage.getCaseById(idFromUrl);
      } else if (cnrFromUrl) {
        currentCase = await window.LexFlowCasesStorage.getCaseByCnr(cnrFromUrl);
      }
    }

    if (!currentCase) {
      console.error("Case not found");
      return;
    }

    // Resolve assigned lawyer name
    let lawyerName = "Assigned Counsel";
    let lawyerId = currentCase.lawyer_id || "";

    if (currentCase.team && currentCase.team.length > 0 && currentCase.team[0].name) {
      const tName = currentCase.team[0].name;
      lawyerName = tName.startsWith('Adv.') ? tName : `Adv. ${tName}`;
      lawyerId = currentCase.team[0].id || lawyerId;
    } else if (currentCase.lawyer_id && window.LexFlowAPI) {
      try {
        const lawyerUser = await window.LexFlowAPI.users.getById(currentCase.lawyer_id, currentUser.role);
        if (lawyerUser) {
          const lName = lawyerUser.fullName || lawyerUser.name;
          lawyerName = lName.startsWith('Adv.') ? lName : `Adv. ${lName}`;
        }
      } catch (e) {
        console.warn("Could not fetch lawyer info:", e);
      }
    }

    // Resolve law firm name
    const FIRM_NAMES = {
      'firm-1': 'Sharma & Associates',
      'firm-2': 'Khanna & Co',
      'firm-3': 'Tech Legal Bangalore',
      'firm-4': 'Coastal Legal Chennai',
      'firm-5': 'Cyber Law Experts Hyderabad'
    };

    let firmName = FIRM_NAMES[currentCase.lawfirm_id] || "Sharma & Associates";
    if (currentCase.lawfirm_id && window.LexFlowAPI) {
      try {
        const firmData = await window.LexFlowAPI.lawFirms.getById(currentCase.lawfirm_id, currentUser.role);
        if (firmData && firmData.name) {
          firmName = firmData.name;
        }
      } catch (e) {
        try {
          const firmUser = await window.LexFlowAPI.users.getById(currentCase.lawfirm_id, currentUser.role);
          if (firmUser) firmName = firmUser.name || firmUser.fullName || firmName;
        } catch (err) {}
      }
    }

    // Render Page Header & Breadcrumb
    const pageTitle = document.querySelector(".page-header h1");
    if (pageTitle) pageTitle.textContent = `${currentCase.case_type || 'Case'} Details`;

    const titleEl = document.querySelector(".page-header p");
    if (titleEl) titleEl.textContent = currentCase.brief_description || currentCase.description || currentCase.case_type || 'Case Details';
    
    const breadcrumb = document.querySelector(".breadcrumb .current");
    if (breadcrumb) breadcrumb.textContent = `CNR: ${currentCase.cnr || 'N/A'}`;

    // Render Info Grid
    const infoGrid = document.querySelector(".info-grid");
    if (infoGrid) {
      const advocateLink = lawyerId ? `client-case-advocate-profile.html?id=${lawyerId}` : '#';
      infoGrid.innerHTML = `
        <div class="info-item"><label>CNR Number</label><div class="value">${currentCase.cnr || 'N/A'}</div></div>
        <div class="info-item"><label>Case Type</label><div class="value">${currentCase.case_type || 'General'}</div></div>
        <div class="info-item"><label>Law Firm</label><div class="value">${firmName}</div></div>
        <div class="info-item"><label>Assigned Lawyer</label><div class="value link" onclick="window.location.href='${advocateLink}'">${lawyerName}</div></div>
        <div class="info-item"><label>Filed Date</label><div class="value">${formatDate(currentCase.filed_date || currentCase.created_at)}</div></div>
        <div class="info-item"><label>Status</label><div class="value"><span class="badge-status">${currentCase.status || "Active"}</span></div></div>
      `;
    }

    // Render Hearing Banner
    const hearingBanner = document.querySelector(".hearing-banner");
    if (hearingBanner) {
      const nextHearing = currentCase.nextHearing || null;
      if (nextHearing && nextHearing.date) {
        const hearingDate = new Date(nextHearing.date);
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const monthEl = hearingBanner.querySelector(".hearing-date .month");
        const dayEl = hearingBanner.querySelector(".hearing-date .day");
        const titleEl = hearingBanner.querySelector(".hearing-info .title");
        const subEl = hearingBanner.querySelector(".hearing-info .sub");
        if (monthEl) monthEl.textContent = months[hearingDate.getMonth()] || "TBD";
        if (dayEl) dayEl.textContent = hearingDate.getDate() || "--";
        if (titleEl) titleEl.textContent = "Next Hearing Scheduled";
        if (subEl) subEl.textContent = `${nextHearing.time || "10:30 AM"} • ${nextHearing.description || "Scheduled Court Appearance"}`;
      } else {
        const monthEl = hearingBanner.querySelector(".hearing-date .month");
        const dayEl = hearingBanner.querySelector(".hearing-date .day");
        const titleEl = hearingBanner.querySelector(".hearing-info .title");
        const subEl = hearingBanner.querySelector(".hearing-info .sub");
        if (monthEl) monthEl.textContent = "NEW";
        if (dayEl) dayEl.textContent = "CASE";
        if (titleEl) titleEl.textContent = "Case Active & Under Legal Review";
        if (subEl) subEl.textContent = `Filed on ${formatDate(currentCase.filed_date || currentCase.created_at)} • Next hearing date will be updated upon court scheduling`;
      }
    }

    // Render Progress Bar
    const progress = typeof currentCase.progress === 'number' ? currentCase.progress : 15;
    const pctEl = document.querySelector(".prog-label .pct");
    if (pctEl) pctEl.textContent = `${progress}% Complete`;
    
    const progressFill = document.querySelector(".progress-bar .fill");
    if (progressFill) {
      progressFill.style.width = "0%";
      setTimeout(() => {
        progressFill.style.width = `${progress}%`;
      }, 100);
    }

    // Render Timeline
    const timeline = (currentCase.timeline && currentCase.timeline.length > 0)
      ? currentCase.timeline
      : [
          {
            title: "Case Initialized",
            date: formatDate(currentCase.filed_date || currentCase.created_at),
            note: `Matter initiated from consultation and assigned to ${lawyerName} at ${firmName}.`
          }
        ];
    renderTimeline(timeline);

    // Fetch and Render Documents
    try {
      const docsResp = await fetch(`http://localhost:3000/documents?caseId=${currentCase.id}`, {
        credentials: 'include',
        headers: { role: currentUser.role }
      });
      if (docsResp.ok) {
        const backendDocs = await docsResp.json();
        currentCase.documents = Array.isArray(backendDocs) ? backendDocs : [];
      } else {
        currentCase.documents = [];
      }
    } catch (e) {
      console.warn("Could not fetch case documents", e);
      currentCase.documents = [];
    }
    renderDocuments(currentCase.documents);

  } catch (error) {
    console.error("Error loading case details:", error);
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initCaseDetails);
} else {
  initCaseDetails();
}
