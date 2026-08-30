let allData = {},
  currentCase = null,
  currentTasks = [];

// Use shared cases storage utility
const casesStorage = window.LexFlowCasesStorage;




function saveAllData() {
  // No-op: backend is the source of truth
}
const caseTopTitle = document.getElementById("caseTopTitle"),
  caseTopSub = document.getElementById("caseTopSub"),
  caseProgPct = document.getElementById("caseProgPct"),
  caseProgFill = document.getElementById("caseProgFill"),
  caseTopStatus = document.getElementById("caseTopStatus"),
  teamContainer = document.getElementById("teamContainer"),
  clientContact = document.getElementById("clientContact"),
  opposingParty = document.getElementById("opposingParty"),
  pendingCountBadge = document.getElementById("pendingCountBadge"),
  pendingTasksContainer = document.getElementById("pendingTasksContainer"),
  documentsTbody = document.getElementById("documentsTbody");
async function initCaseDetails() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    let cnrFromUrl = urlParams.get("cnr");
    let idFromUrl = urlParams.get("id");
    
    // If no URL parameter, check if a newly created case ID is in session
    if (!idFromUrl && !cnrFromUrl) {
      const sessionCaseId = sessionStorage.getItem('last_created_case_id');
      if (sessionCaseId) {
        idFromUrl = sessionCaseId;
      }
    }

    const user = (casesStorage && casesStorage.getCurrentUser()) || JSON.parse(localStorage.getItem('currentUser') || '{}');
    const role = (user.role || 'firmadmin').toLowerCase();

    // 1. Fetch by direct ID
    if (idFromUrl) {
      try {
        if (window.LexFlowAPI && window.LexFlowAPI.cases) {
          currentCase = await window.LexFlowAPI.cases.getById(idFromUrl, role);
        }
      } catch (err) {
        console.warn("LexFlowAPI.cases.getById failed:", err);
      }
      if (!currentCase && casesStorage) {
        try {
          currentCase = await casesStorage.getCaseById(idFromUrl);
        } catch (err) {
          console.warn("casesStorage.getCaseById failed:", err);
        }
      }
    } else if (cnrFromUrl) {
      try {
        if (window.LexFlowAPI && window.LexFlowAPI.cases) {
          currentCase = await window.LexFlowAPI.cases.getById(cnrFromUrl, role);
        }
      } catch (e) {}
      if (!currentCase && casesStorage) {
        currentCase = await casesStorage.getCaseByCnr(cnrFromUrl);
      }
    }

    // 2. Fallback: Search all cases without restrictive filters
    if (!currentCase && (idFromUrl || cnrFromUrl)) {
      try {
        let allCases = [];
        if (window.LexFlowAPI && window.LexFlowAPI.cases) {
          allCases = (await window.LexFlowAPI.cases.getAll({}, role)) || [];
        } else if (casesStorage) {
          allCases = (await casesStorage.getCases()) || [];
        }

        if (Array.isArray(allCases) && allCases.length > 0) {
          if (idFromUrl) {
            currentCase = allCases.find(c => String(c.id) === String(idFromUrl) || String(c.cnr) === String(idFromUrl));
          } else if (cnrFromUrl) {
            currentCase = allCases.find(c => String(c.cnr) === String(cnrFromUrl) || String(c.id) === String(cnrFromUrl));
          }
        }
      } catch (e) {
        console.warn("Fallback case lookup failed:", e);
      }
    }

    if (!currentCase) { 
      console.warn("No matching case found on backend:", { idFromUrl, cnrFromUrl });
      const titleEl = document.getElementById("caseTopTitle");
      if (titleEl) titleEl.textContent = "Case Not Found";
      const subEl = document.getElementById("caseTopSub");
      if (subEl) subEl.innerHTML = `Case identifier <strong>${idFromUrl || cnrFromUrl || 'unknown'}</strong> could not be located. <a href="firm-cases.html" style="color:#3b5bdb; text-decoration:underline;">Return to Cases</a>`;
      return; 
    }

    // Ensure safe default properties
    currentCase.progress = typeof currentCase.progress === 'number' ? currentCase.progress : 15;
    if (!currentCase.timeline) currentCase.timeline = [];
    if (!currentCase.documents) currentCase.documents = [];

    // Fetch tasks specifically for this case
    const resolvedCaseId = currentCase.id !== undefined ? String(currentCase.id) : null;
    currentTasks = resolvedCaseId
      ? (await casesStorage.getTasks({ caseId: resolvedCaseId })) || []
      : [];

    const firmId = user?.firmId || null;

    // Fetch users (lawyers) specifically for this firm
    let users = [];
    if (firmId && window.LexFlowAPI) {
      users = await window.LexFlowAPI.users.getLawyers(firmId, role);
    } else {
      users = (await casesStorage.getUsers()) || [];
    }
    allData.users = users;

    // Fetch documents from backend for this case
    if (resolvedCaseId) {
      try {
        const docsResp = await fetch(`http://localhost:3000/documents?caseId=${resolvedCaseId}`, {
          credentials: 'include',
          headers: { role }
        });
        if (docsResp.ok) {
          const backendDocs = await docsResp.json();
          currentCase.documents = Array.isArray(backendDocs) ? backendDocs : [];
        } else {
          currentCase.documents = [];
        }
      } catch (e) {
        console.warn("Could not fetch case documents from backend", e);
        currentCase.documents = [];
      }
    }

    // Resolve client details
    if (!currentCase.client || !currentCase.client.contact || currentCase.client.contact === "Data Pending") {
      let clientName = currentCase.client?.contact || "Client Contact";
      let clientRole = currentCase.client?.type || "Individual";
      let clientEmail = currentCase.client?.email || "N/A";
      let clientPhone = currentCase.client?.phone || "N/A";

      if (currentCase.client_id && window.LexFlowAPI) {
        try {
          const clientUser = await window.LexFlowAPI.users.getById(currentCase.client_id, role);
          if (clientUser) {
            clientName = clientUser.fullName || clientUser.name || clientName;
            clientRole = clientUser.role ? clientUser.role.charAt(0).toUpperCase() + clientUser.role.slice(1) : clientRole;
            clientEmail = clientUser.email || clientEmail;
            clientPhone = clientUser.phoneNumber || clientUser.phone || clientPhone;
          }
        } catch (err) {
          console.warn("Could not fetch client details by id:", err);
        }
      }

      currentCase.client = {
        contact: clientName,
        type: clientRole,
        opposingParty: currentCase.client?.opposingParty || "To be determined",
        email: clientEmail,
        phone: clientPhone,
      };
    }
    
    // Resolve assigned team
    if (!currentCase.team || currentCase.team.length === 0) {
      const lawyer = users.find(u => String(u.id) === String(currentCase.lawyer_id)) || { fullName: "Assigned Lawyer" };
      currentCase.team = [
        {
          id: currentCase.lawyer_id || "ADM001",
          name: lawyer.fullName || lawyer.name || "Lead Counsel",
          role: "Lead Counsel",
        },
      ];
    }

    renderHeader();
    renderOverview();
    renderTeam();
    renderClientInfo();
    renderPendingTasks();
    renderDocuments();
  } catch (e) {
    console.error("Error loading case details:", e);
  }
}
function formatDate(e) {
  if (!e) return "";
  const d = new Date(e);
  if (isNaN(d.getTime())) return String(e);
  return d.toLocaleDateString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function getStatusIcon(e) {
  return "Completed" === e
    ? '\n            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">\n                <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#D1FAE5" stroke="#10B981" stroke-width="2" stroke-linejoin="round"/>\n                <path d="M14 2V8H20" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\n                <circle cx="17" cy="17" r="5" fill="#10B981"/>\n                <path d="M15 17L16.5 18.5L19 15.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>\n            </svg>'
    : '\n            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">\n                <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" fill="#FEF3C7" stroke="#F59E0B" stroke-width="2" stroke-linejoin="round"/>\n                <path d="M14 2V8H20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\n                <circle cx="17" cy="17" r="5" fill="#F59E0B"/>\n                <path d="M15.5 15.5L18.5 18.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>\n                <path d="M18.5 15.5L15.5 18.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>\n            </svg>';
}
function renderHeader() {
  if (!currentCase) return;
  const breadcrumbEl = document.querySelector(".breadcrumb .current");
  if (breadcrumbEl) breadcrumbEl.textContent = `Case #${currentCase.cnr || ''}`;
  
  const titleEl = document.getElementById("caseTopTitle");
  if (titleEl) titleEl.textContent = currentCase.case_type || 'N/A';
  
  const subEl = document.getElementById("caseTopSub");
  if (subEl) subEl.textContent = `${currentCase.case_type || 'Case'} | Opened: ${formatDate(currentCase.filed_date || currentCase.created_at)}`;
  
  const statusEl = document.getElementById("caseTopStatus");
  if (statusEl) {
    statusEl.textContent = currentCase.status || 'Active';
    if ("Ongoing" === currentCase.status || "Active" === currentCase.status) {
      statusEl.style.background = "#d1fae5";
      statusEl.style.color = "#065f46";
    } else {
      statusEl.style.background = "#fef3c7";
      statusEl.style.color = "#92400e";
    }
  }
}
function renderOverview() {
  if (!currentCase) return;
  const prog = typeof currentCase.progress === 'number' ? currentCase.progress : 15;
  const pctEl = document.getElementById("caseProgPct");
  if (pctEl) pctEl.textContent = `${prog}% Completed`;
  
  const fillEl = document.getElementById("caseProgFill");
  if (fillEl) {
    setTimeout(() => {
      fillEl.style.width = `${prog}%`;
    }, 100);
  }
  renderPhases();
}
function renderPhases() {
  const e = currentCase.progress || 0,
    t = document.getElementById("phaseTitle"),
    n = [
      { id: "phase-1", name: "Filing", min: 0, max: 20 },
      { id: "phase-2", name: "Preparation", min: 21, max: 40 },
      { id: "phase-3", name: "Discovery", min: 41, max: 60 },
      { id: "phase-4", name: "Mediation", min: 61, max: 80 },
      { id: "phase-5", name: "Trial", min: 81, max: 100 },
    ];
  let a = n[0];
  if (
    (n.forEach((t, n) => {
      const o = document.getElementById(t.id);
      o &&
        (e >= t.min
          ? ((o.style.color = "#3b5bdb"),
            (o.style.fontWeight = "800"),
            (a = { ...t, index: n + 1 }))
          : ((o.style.color = "#9ca3af"), (o.style.fontWeight = "700")));
    }),
    t)
  ) {
    let e = "";
    ("Discovery" === a.name && (e = " & Evidence Collection"),
      "Filing" === a.name && (e = " & Documentation"),
      (t.textContent = `Phase ${a.index}: ${a.name}${e}`));
  }
}
function renderTeam() {
  const container = document.getElementById("teamContainer");
  if (!container) return;

  if (!Array.isArray(currentCase.team) || currentCase.team.length === 0) {
    container.innerHTML = '<p style="color:#6b7280; font-size:12px; padding:8px;">No team members assigned.</p>';
    return;
  }
  
  const validMembers = currentCase.team.filter(e => e && typeof e === 'object' && !Array.isArray(e));
  if (validMembers.length === 0) {
    container.innerHTML = '<p style="color:#6b7280; font-size:12px; padding:8px;">No team members assigned.</p>';
    return;
  }

  container.innerHTML = validMembers
    .map((e) => {
      const name = e.name || "Assigned Lawyer";
      const role = e.role || "Lead Counsel";
      const initials = name.split(' ').map(n => n[0] || '').join('').substring(0, 2).toUpperCase() || "AL";
      const isLead = (role || '').toLowerCase().includes('lead');
      const bg = isLead ? '#eef2ff' : '#f3f4f6';
      const color = isLead ? '#3b5bdb' : '#4b5563';
      
      return `
        <div style="display: flex; gap: 14px; align-items: center; padding: 4px 0;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: ${bg}; color: ${color}; display: flex; align-items:center; justify-content:center; font-size: 13px; font-weight:700; border: 1px solid rgba(0,0,0,0.05);">${initials}</div>
            <div style="display:flex; flex-direction:column; gap: 2px;">
                <span style="font-size:14px; font-weight:700; color:#1a1a2e;">${name}</span>
                <span style="font-size:11px; font-weight:600; color:#6b7280; text-transform: uppercase; letter-spacing: 0.3px;">${role}</span>
            </div>
        </div>
      `;
    })
    .join("");
}

function renderClientInfo() {
  const contactEl = document.getElementById("clientContact");
  const typeEl = document.getElementById("clientType");
  const emailEl = document.getElementById("clientEmail");
  const phoneEl = document.getElementById("clientPhone");
  const opposingEl = document.getElementById("opposingParty");

  if (currentCase.client) {
    if (contactEl) contactEl.textContent = currentCase.client.contact || "Private Client";
    if (typeEl) typeEl.textContent = currentCase.client.type || "Individual";
    if (emailEl) emailEl.textContent = currentCase.client.email || "N/A";
    if (phoneEl) phoneEl.textContent = currentCase.client.phone || "N/A";
    if (opposingEl) opposingEl.textContent = currentCase.client.opposingParty || "To be determined";
  } else {
    if (contactEl) contactEl.textContent = currentCase.client_name || "Private Client";
    if (typeEl) typeEl.textContent = "Individual";
    if (emailEl) emailEl.textContent = "N/A";
    if (phoneEl) phoneEl.textContent = "N/A";
    if (opposingEl) opposingEl.textContent = currentCase.opposing_party || "To be determined";
  }
}
function renderPendingBanner() {
  const e = currentTasks.filter((e) => "Pending" === e.status),
    t = document.querySelector(".content"),
    n = document.getElementById("pendingTasksBanner");
  if ((n && n.remove(), e.length > 0)) {
    const n = document.createElement("div");
    ((n.id = "pendingTasksBanner"),
      (n.className = "hearing-banner"),
      (n.style.background = "#fffbeb"),
      (n.style.border = "1px solid #fde68a"),
      (n.style.marginBottom = "24px"),
      (n.style.padding = "12px 20px"),
      (n.style.cursor = "pointer"),
      (n.onclick = () =>
        document
          .getElementById("pendingTasksContainer")
          .scrollIntoView({ behavior: "smooth" })),
      (n.innerHTML = `\n            <div class="task-status-icon" style="width:32px; height:32px;">\n                ${getStatusIcon("Pending")}\n            </div>\n            <div class="hearing-info">\n                <div class="title" style="color: #92400e;">You have ${e.length} pending tasks for this case</div>\n                <div class="sub" style="color: #b45309;">Please review and update the status of these responsibilities.</div>\n            </div>\n            <div style="margin-left:auto; color:#d97706;">\n                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>\n            </div>\n        `),
      t.prepend(n));
  }
}
function renderPendingTasks() {
  const e = currentTasks.filter((e) => "Pending" === e.status);
  ((pendingCountBadge.textContent = e.length),
    0 !== e.length
      ? ((pendingTasksContainer.innerHTML = e
          .map(
            (e) =>
              `\n            <div style="display:flex; gap:12px; align-items:center; border: 1px solid #f3f4f6; padding: 12px; border-radius: 8px; background: #fffaf0; border-left: 4px solid #f59e0b;">\n                <div class="task-status-icon" style="width:24px; height:24px; flex-shrink:0;">\n                    ${getStatusIcon("Pending")}\n                </div>\n                <div style="display:flex; flex-direction:column; gap:2px; flex:1;">\n                    <div style="display:flex; justify-content:space-between; align-items:center;">\n                        <span style="font-size:13px; font-weight:700; color:#1a1a2e;">${e.name}</span>\n                        <span style="font-size:10px; font-weight:700; color:#3b5bdb; background:#eef2ff; padding:2px 6px; border-radius:4px;">${e.assignedUser}</span>\n                    </div>\n                    <span style="font-size:11px; font-weight:600; color:#92400e; display:flex; align-items:center; gap:4px;">\n                        <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>\n                        Due: ${e.dueDate}\n                    </span>\n                </div>\n                <input type="checkbox" style="width:16px; height:16px; cursor:pointer;" onclick="event.stopPropagation(); markTaskAsDone('${e.id}')" />\n            </div>\n        `,
          )
          .join("")),
        window.markTaskAsDone ||
          (window.markTaskAsDone = async (id) => {
            try {
              const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
              const role = (currentUser.role || 'firmAdmin').toLowerCase();
              await LexFlowAPI.tasks.update(id, { status: "Completed" }, role);
              await initCaseDetails(); // Refresh UI
            } catch (err) {
              console.error("Failed to complete task:", err);
            }
          }))
      : (pendingTasksContainer.innerHTML =
          '<div style="font-size:12px; color:#9ca3af; padding:12px; text-align:center;">No pending tasks.</div>'));
}

function renderDocuments() {
  currentCase.documents = currentCase.documents || [];
  if (!documentsTbody) return;

  if (currentCase.documents.length !== 0) {
    documentsTbody.innerHTML = currentCase.documents
      .map((e, t) => {
        let n = e.type ? e.type.toUpperCase() : "DOC",
          a = e.type ? e.type.toLowerCase() : "pdf";
        if (a !== "pdf" && a !== "zip") a = "pdf";
        const downloadHref = e.url || `http://localhost:3000/data/docs/${e.name || 'document.pdf'}`;
        return `
        <tr>
            <td>
                <div class="doc-name">
                    <div class="doc-icon ${a}">${n}</div>
                    <span>${e.name || 'Document'}</span>
                </div>
            </td>
            <td>${e.date || "Today"}</td>
            <td>
                <span class="badge-${"Reviewing" === e.status ? "reviewing" : "verified"}">
                    ${e.status || "Verified"}
                </span>
            </td>
            <td>
                <div style="display:flex; gap: 8px;">
                    <a href="${downloadHref}" download="${e.name || 'document.pdf'}" class="download-btn" title="Download"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11"/></svg></a>
                    <button class="download-btn" title="Delete Document" onclick="deleteDocument('${e.id || t}')" style="color:#ef4444;"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
            </td>
        </tr>
        `;
      })
      .join("");
  } else {
    documentsTbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; padding: 24px; color:#9ca3af;">No documents available.</td></tr>';
  }
}
async function saveData() {
  if (!currentCase || !currentCase.id) return;
  try {
    // Strip read-only properties that the backend DTO rejects
    const { id, created_at, ...updateDto } = currentCase;

    await casesStorage.updateCase(id, updateDto);
    console.log("[DEBUG] Case updated successfully");
    await initCaseDetails(); // Refresh UI
  } catch (err) {
    console.error("Failed to save case data:", err);
    alert("Failed to save changes to backend: " + err.message);
  }
}
function renderEditTeamList() {
  const listEl = document.getElementById("editTeamList");
  if (!listEl) return;
  
  listEl.innerHTML = (currentCase.team || [])
    .map(
      (e, t) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f9fafb; padding:10px 14px; border-radius:8px; border: 1px solid #f3f4f6;">
            <div style="display:flex; flex-direction:column;">
                <div style="font-size:13px; font-weight:700; color: #111827;">${e.name}</div>
                <div style="font-size:11px; color:#6b7280; font-weight: 500;">${e.role}</div>
            </div>
            <button onclick="removeTeamMember(${t})" style="color:#9ca3af; border:none; background:none; cursor:pointer; font-size: 18px; padding: 4px; transition: color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#9ca3af'">&times;</button>
        </div>
    `,
    )
    .join("");
}
window.openModal = function (e) {
  const el = document.getElementById(e);
  if (el) el.classList.add("active");
};

window.closeModal = function (e) {
  const t = document.getElementById(e);
  if (t) {
    LexValidation.clearAllErrors(t);
    t.classList.remove("active");
  }
};

window.exportCSV = function () {
  if (!currentCase) return;
  let e = "data:text/csv;charset=utf-8,";
  e += "Case ID,Title,Court,Status,Opened\n";
  e += `"${currentCase.cnr || ''}","${currentCase.case_type || ''}","${currentCase.brief_description || ''}","${currentCase.status || ''}","${currentCase.filed_date || ''}"`;
  const t = encodeURI(e);
  const n = document.createElement("a");
  n.setAttribute("href", t);
  n.setAttribute("download", `case_export_${currentCase.cnr || 'details'}.csv`);
  document.body.appendChild(n);
  n.click();
  document.body.removeChild(n);
};

window.openEditCaseModal = function () {
  if (!currentCase) return;
  const titleEl = document.getElementById("editCaseTitle");
  const statusEl = document.getElementById("editCaseStatus");
  const progEl = document.getElementById("editCaseProgress");
  if (titleEl) titleEl.value = currentCase.case_type || '';
  if (statusEl) statusEl.value = currentCase.status || 'Active';
  if (progEl) progEl.value = currentCase.progress || 0;
  window.openModal("editCaseModal");
};

window.saveCaseDetailsModal = async function () {
  const e = document.getElementById("editCaseTitle");
  const t = document.getElementById("editCaseProgress");
  const n = document.getElementById("editCaseModal");
  LexValidation.clearAllErrors(n);
  const a = [
    {
      input: e,
      validator: (e) => LexValidation.validateRequired(e, "Case title"),
    },
    { input: t, validator: LexValidation.validateProgress },
  ];
  if (!LexValidation.validateForm(a)) {
    n.querySelector(".modal-content").classList.add("form-shake");
    setTimeout(() => n.querySelector(".modal-content").classList.remove("form-shake"), 450);
    return;
  }
  currentCase.case_type = e.value.trim();
  currentCase.status = document.getElementById("editCaseStatus").value;
  currentCase.progress = parseInt(t.value, 10);
  await saveData();
  window.closeModal("editCaseModal");
};

window.addDocumentPrompt = function () {
  if (!currentCase) return;
  const nameEl = document.getElementById("docClientName");
  const cnrEl = document.getElementById("docCaseCnr");
  const descEl = document.getElementById("docDescription");
  const selEl = document.getElementById("selectedFileName");
  if (nameEl) nameEl.value = (currentCase.case_type || "").split("vs.")[0].trim();
  if (cnrEl) cnrEl.value = currentCase.cnr || '';
  if (descEl) descEl.value = "";
  if (selEl) selEl.innerHTML = 'Drag & Drop Files Here or <span style="color:#3b5bdb; text-decoration:underline;">Click to Upload</span>';
  window.openModal("documentModal");
};

window.saveDocumentModal = async function () {
  const fileInput = document.getElementById("hiddenFileInput");
  const typeSelect = document.getElementById("docTypeSelect");
  const typeVal = typeSelect ? typeSelect.value : "PDF";

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("Please select a file to upload.");
    return;
  }

  const selectedFile = fileInput.files[0];
  if (selectedFile.size > 10 * 1024 * 1024) {
    alert("File size exceeds 10MB limit.");
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const role = (currentUser.role || 'firmadmin').toLowerCase();
  const uploaderEmail = currentUser.email || 'unknown@lexflow.in';
  const caseId = String(currentCase.id);

  const formData = new FormData();
  formData.append('name', selectedFile.name);
  formData.append('caseId', caseId);
  formData.append('type', typeVal.toUpperCase());
  formData.append('fileType', (selectedFile.name.split('.').pop() || 'BIN').toUpperCase().slice(0, 3));
  formData.append('access', 'PRIVATE');
  formData.append('version', '1');
  formData.append('file', selectedFile);

  try {
    const headers = {
      "role": role,
      "x-user-email": uploaderEmail
    };
    if (window.LexFlowAPI && window.LexFlowAPI.getCsrfToken) {
      const token = await window.LexFlowAPI.getCsrfToken();
      if (token) headers['x-csrf-token'] = token;
    }

    const resp = await fetch("http://localhost:3000/documents", {
      credentials: 'include',
      method: "POST",
      headers,
      body: formData
    });

    if (!resp.ok) {
      throw new Error('Upload failed: ' + resp.status);
    }
    
    const createdDoc = await resp.json();
    currentCase.documents = currentCase.documents || [];
    currentCase.documents.unshift(createdDoc);
    renderDocuments();
    window.closeModal("documentModal");
  } catch (err) {
    console.error(err);
    alert("Failed to upload document: " + err.message);
  }
};

window.deleteDocument = async function (docId) {
  if (!docId && docId !== 0) return;
  if (!confirm("Are you sure you want to delete this document?")) return;
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const role = (currentUser.role || 'firmadmin').toLowerCase();
    
    const headers = { "role": role };
    if (window.LexFlowAPI && window.LexFlowAPI.getCsrfToken) {
      const token = await window.LexFlowAPI.getCsrfToken();
      if (token) headers['x-csrf-token'] = token;
    }

    const resp = await fetch(`http://localhost:3000/documents/${docId}`, {
      credentials: 'include',
      method: "DELETE",
      headers
    });
    if (resp.ok) {
      currentCase.documents = (currentCase.documents || []).filter(d => String(d.id) !== String(docId));
      renderDocuments();
    } else {
      if (!isNaN(Number(docId))) {
        currentCase.documents.splice(Number(docId), 1);
        renderDocuments();
      } else {
        alert("Failed to delete document.");
      }
    }
  } catch (err) {
    console.error(err);
    alert("Delete failed: " + err.message);
  }
};

window.openEditClientModal = function () {
  if (!currentCase || !currentCase.client) return;
  const cEl = document.getElementById("editClientContact");
  const eEl = document.getElementById("editClientEmail");
  const pEl = document.getElementById("editClientPhone");
  const tEl = document.getElementById("editClientType");
  const oEl = document.getElementById("editOpposingParty");
  if (cEl) cEl.value = currentCase.client.contact || '';
  if (eEl) eEl.value = currentCase.client.email || "";
  if (pEl) pEl.value = currentCase.client.phone || "";
  if (tEl) tEl.value = currentCase.client.type || "Individual";
  if (oEl) oEl.value = currentCase.client.opposingParty || "";
  window.openModal("editClientModal");
};

window.saveClientDetails = async function () {
  const e = document.getElementById("editClientContact");
  const t = document.getElementById("editClientModal");
  LexValidation.clearAllErrors(t);
  const n = [
    {
      input: e,
      validator: (e) => LexValidation.validateRequired(e, "Primary contact"),
    },
  ];
  if (!LexValidation.validateForm(n)) {
    t.querySelector(".modal-content").classList.add("form-shake");
    setTimeout(() => t.querySelector(".modal-content").classList.remove("form-shake"), 450);
    return;
  }
  currentCase.client = {
    contact: e.value.trim(),
    email: document.getElementById("editClientEmail").value.trim(),
    phone: document.getElementById("editClientPhone").value.trim(),
    type: document.getElementById("editClientType").value,
    opposingParty: document.getElementById("editOpposingParty").value.trim(),
  };
  await saveData();
  window.closeModal("editClientModal");
};

window.openEditTeamModal = function () {
  renderEditTeamList();
  const selEl = document.getElementById("addTeamMemberSelect");
  if (selEl) {
    selEl.innerHTML = (allData.users || [])
      .filter((e) => {
        const r = (e.role || '').toLowerCase();
        return r === "lawyer" || r === "intern";
      })
      .map((e) => `<option value="${e.id}">${e.fullName || e.name}</option>`)
      .join("");
  }
  window.openModal("editTeamModal");
};

window.addTeamMember = async function () {
  const e = document.getElementById("addTeamMemberSelect");
  const roleInput = document.getElementById("addTeamMemberRole");
  const t = roleInput ? roleInput.value.trim() || "Legal Counsel" : "Legal Counsel";
  const n = (allData.users || []).find((u) => u.id === e.value);
  
  if (n) {
    if (!currentCase.team) currentCase.team = [];
    currentCase.team.push({ 
      id: n.id, 
      name: n.fullName || n.name, 
      role: t 
    });
    if (roleInput) roleInput.value = "";
    await saveData();
    renderEditTeamList();
  }
};

window.removeTeamMember = async function (e) {
  if (currentCase && currentCase.team) {
    currentCase.team.splice(e, 1);
    await saveData();
    renderEditTeamList();
  }
};

window.openAddTaskModal = function () {
  const sel = document.getElementById("newTaskAssignee");
  if (sel) {
    sel.innerHTML = (allData.users || [])
      .filter(u => {
        const r = (u.role || '').toLowerCase();
        return r === 'lawyer' || r === 'intern';
      })
      .map((e) => `<option value="${e.fullName || e.name}">${e.fullName || e.name}</option>`)
      .join("");
  }
  window.openModal("addTaskModal");
};

window.saveNewTask = async function () {
  const e = document.getElementById("newTaskName");
  const t = document.getElementById("newTaskDueDate");
  const n = document.getElementById("addTaskModal");
  LexValidation.clearAllErrors(n);
  const a = [
    {
      input: e,
      validator: (e) => LexValidation.validateRequired(e, "Task name"),
    },
    { input: t, validator: (e) => LexValidation.validateDate(e, "Due date") },
  ];
  if (!LexValidation.validateForm(a)) {
    n.querySelector(".modal-content").classList.add("form-shake");
    setTimeout(() => n.querySelector(".modal-content").classList.remove("form-shake"), 450);
    return;
  }
  const o = document.getElementById("newTaskAssignee").value;
  const i = document.getElementById("newTaskPriority").value;
  let currentUserData = {};
  try { currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch (e) {}

  const payload = {
      name: e.value.trim(),
      caseTitle: currentCase.case_type || 'N/A',
      assignedUser: o,
      priority: i,
      dueDate: t.value,
      status: "Pending",
      caseId: String(currentCase.id),
      caseCnr: currentCase.cnr,
      firmId: currentUserData.firmId || 'firm-1',
      description: ""
  };

  try {
      const role = (currentUserData.role || 'firmAdmin').toLowerCase();
      await LexFlowAPI.tasks.create(payload, role);
      window.closeModal("addTaskModal");
      await initCaseDetails();
  } catch (err) {
      console.error("Failed to create task:", err);
      alert("Failed to create task. Is the server running?");
  }
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initCaseDetails);
} else {
  initCaseDetails();
}
