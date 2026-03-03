/* ═══════════════════════════════════════════════════════
   js/authority.js — Authority Dashboard, Reviews,
                      Modal, Institutions, Analytics
   ═══════════════════════════════════════════════════════ */

// ── Authority Dashboard ───────────────────────────────
async function loadAuthorityData() {
  try {
    const [statsRes, instRes] = await Promise.all([
      fetch(`${API}/authority/stats/`),
      fetch(`${API}/authority/all/`)
    ]);
    const stats = await statsRes.json();
    const insts = await instRes.json();
    allInstitutions = insts;

    document.getElementById('ath-total').textContent   = stats.total_institutions || 0;
    document.getElementById('ath-pending').textContent = stats.pending_approvals  || 0;
    document.getElementById('ath-approved').textContent = stats.approved          || 0;
    document.getElementById('ath-rejected').textContent = stats.rejected          || 0;
    document.getElementById('ath-high').textContent    = stats.high_risk          || 0;
    document.getElementById('ath-medium').textContent  = stats.medium_risk        || 0;

    if (stats.pending_approvals > 0) {
      document.getElementById('authPendingBadge').style.display = 'block';
      document.getElementById('authPendingCount').textContent   = stats.pending_approvals;
    }

    setTimeout(() => buildAuthCharts(stats, insts), 100);

    // High risk table
    const high   = insts.filter(i => i.risk_level === 'High');
    const highEl = document.getElementById('authHighRiskBody');
    if (!high.length) {
      highEl.innerHTML = '<div style="color:var(--gray-500);padding:20px;text-align:center">No high-risk institutions found.</div>';
      return;
    }
    highEl.innerHTML = `<table class="data-table">
      <thead><tr><th>Institution</th><th>State</th><th>Students</th><th>Faculty</th><th>Risk Score</th><th>Approval</th></tr></thead>
      <tbody>${high.map(i => `<tr>
        <td><b>${i.institution_name}</b><br><small style="color:var(--gray-500)">${i.aicte_id || '—'}</small></td>
        <td>${i.state}</td><td>${i.total_students || '—'}</td><td>${i.total_faculty || '—'}</td>
        <td><span class="badge badge-high">${i.risk_score}/100</span></td>
        <td><span class="badge badge-${i.approval_status || 'pending'}">${i.approval_status || 'pending'}</span></td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch (e) {
    console.error('Authority load error:', e);
  }
}

// ── Pending Reviews ───────────────────────────────────
async function loadPendingReviews(statusFilter) {
  const body = document.getElementById('pendingReviewsBody');
  body.innerHTML = '<div style="text-align:center;padding:32px"><div class="loading-spinner spin-orange" style="width:28px;height:28px;border-width:3px"></div></div>';
  try {
    const url  = `${API}/authority/pending/` + (statusFilter ? `?status=${statusFilter}` : '');
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.length) {
      body.innerHTML = '<div style="color:var(--gray-500);text-align:center;padding:32px">No applications found.</div>';
      return;
    }
    body.innerHTML = data.map(ar => `
      <div class="card">
        <div class="card-header">
          <div>
            <h3>${ar.institution_name}</h3>
            <div style="font-size:12px;color:var(--gray-500)">AICTE ID: ${ar.aicte_id || '—'} | ${ar.state} | Submitted: ${ar.submitted_at}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="badge badge-${ar.risk_level.toLowerCase()}">${ar.risk_level} Risk (${ar.risk_score}/100)</span>
            <span class="badge badge-${ar.status === 'approved' ? 'approved' : ar.status === 'rejected' ? 'rejected' : 'submitted'}">${ar.status}</span>
            ${ar.status !== 'approved' && ar.status !== 'rejected' ? `<button class="btn btn-saffron btn-sm" onclick="openReviewModal(${ar.approval_id})">🔍 Review & Decide</button>` : ''}
          </div>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
            ${[['Students', ar.inst_stats?.total_students || '—'], ['Faculty', ar.inst_stats?.total_faculty || '—'], ['Labs', ar.inst_stats?.total_labs || '—'], ['NAAC', ar.inst_stats?.naac_grade || '—']]
              .map(([l, v]) => `<div style="background:var(--gray-100);border-radius:4px;padding:8px;text-align:center"><div style="font-size:10px;color:var(--gray-500)">${l}</div><div style="font-family:'Rajdhani';font-size:18px;font-weight:700">${v}</div></div>`).join('')}
          </div>
          <div style="font-weight:600;font-size:12px;margin-bottom:6px">Sections Submitted:</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
            ${(ar.sections || []).map(s => `<span class="badge badge-analyzed">${s.toUpperCase()}</span>`).join('')}
          </div>
          ${(ar.risk_factors || []).length > 0 ? `<div style="font-weight:600;font-size:12px;margin-bottom:6px">Top Risk Factors:</div>
          <div>${ar.risk_factors.slice(0, 3).map(f => `<div style="font-size:12px;color:var(--gray-700);padding:4px 0;border-bottom:1px solid var(--gray-200)">⚠️ ${f}</div>`).join('')}</div>` : ''}
          ${ar.authority_notes ? `<div class="alert-banner ${ar.status === 'approved' ? 'success' : 'danger'}" style="margin-top:10px">Authority Notes: ${ar.authority_notes}</div>` : ''}
        </div>
      </div>`).join('');
  } catch (e) {
    body.innerHTML = '<div style="color:var(--red-flag);padding:20px">Error loading pending reviews.</div>';
  }
}

// ── Review Modal ──────────────────────────────────────
async function openReviewModal(approvalId) {
  currentReviewApprovalId = approvalId;
  const modal     = document.getElementById('reviewModal');
  const modalBody = document.getElementById('reviewModalBody');
  modal.classList.add('open');
  modalBody.innerHTML = '<div style="text-align:center;padding:40px"><div class="loading-spinner spin-orange" style="width:28px;height:28px;border-width:3px"></div></div>';

  try {
    const reviewRes  = await fetch(`${API}/authority/pending/`);
    const reviewList = await reviewRes.json();
    const ar = reviewList.find(a => a.approval_id === approvalId);
    if (!ar) { modalBody.innerHTML = '<div style="color:var(--red-flag)">Application not found.</div>'; return; }

    // Fetch PDFs
    let pdfMap = {};
    try {
      const pdfsRes = await fetch(`${API}/institution-pdfs/?institution_id=${ar.institution_id}`);
      if (pdfsRes.ok) {
        const pdfsData = await pdfsRes.json();
        pdfsData.forEach(p => { pdfMap[p.section_type] = p; });
      }
    } catch (e) { console.warn('PDF fetch failed:', e); }

    document.getElementById('reviewModalTitle').textContent = `Review: ${ar.institution_name}`;

    // Section rows
    const secRows = ALL_SECTIONS.map(sec => {
      const info   = ar.sections_data?.[sec];
      const pdf    = pdfMap[sec];
      const pdfBtn = pdf && pdf.presigned_url
        ? `<a href="${pdf.presigned_url}" target="_blank"
            style="display:inline-block;background:var(--navy);color:#fff;padding:4px 10px;
                   border-radius:4px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap">
            📄 View PDF</a>`
        : `<span style="font-size:11px;color:var(--gray-500)">No PDF</span>`;

      if (!info) {
        return `<tr>
          <td><b>${sec.toUpperCase()}</b></td>
          <td colspan="2" style="color:var(--gray-500)">Not uploaded</td>
          <td>${pdfBtn}</td>
          <td><select id="secDec-${sec}-status" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px">
            <option value="pending">Pending</option><option value="approved">Approve</option><option value="rejected">Reject</option>
          </select></td>
          <td><input type="text" id="secDec-${sec}-notes" placeholder="Notes"
              style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;width:100%"></td>
        </tr>`;
      }

      const ai = info.ai_data || {};
      let brief = '';
      if (sec === 'faculty')        brief = `Faculty: ${ai.total_faculty || 0}, PhD: ${ai.faculty_phd_count || 0}`;
      else if (sec === 'labs')       brief = `Labs: ${ai.total_labs || 0}`;
      else if (sec === 'students')   brief = `Students: ${ai.total_students || 0}`;
      else if (sec === 'infrastructure') brief = `Classrooms: ${ai.total_classrooms || 0}, Lib: ${(ai.library_books || 0).toLocaleString()}`;
      else if (sec === 'financials') brief = `Budget: ₹${ai.annual_budget || 0}L`;
      else if (sec === 'accreditation') brief = `NAAC: ${ai.naac_grade || '—'}, ISO: ${ai.iso_certified ? 'Yes' : 'No'}`;

      const uploadedAt = pdf ? `<div style="font-size:10px;color:var(--gray-500)">${pdf.uploaded_at}</div>` : '';
      return `<tr>
        <td><b>${sec.toUpperCase()}</b>${uploadedAt}</td>
        <td style="font-size:12px">${brief}</td>
        <td>${pdfBtn}</td>
        <td><select id="secDec-${sec}-status" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px">
          <option value="pending">Pending</option><option value="approved">Approve</option><option value="rejected">Reject</option>
        </select></td>
        <td><input type="text" id="secDec-${sec}-notes" placeholder="Notes (optional)"
            style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;width:100%"></td>
      </tr>`;
    }).join('');

    // PDF strip
    const totalPDFs = Object.keys(pdfMap).length;
    const pdfStrip  = totalPDFs > 0
      ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
           <span style="font-size:11px;font-weight:700;color:var(--navy)">📁 Uploaded PDFs (${totalPDFs}/6):</span>
           ${ALL_SECTIONS.map(s => {
               const p = pdfMap[s];
               return p && p.presigned_url
                 ? `<a href="${p.presigned_url}" target="_blank" style="background:#E0ECFF;color:#0A3D9E;padding:3px 10px;border-radius:3px;font-size:11px;font-weight:700;text-decoration:none">📄 ${s.toUpperCase()}</a>`
                 : `<span style="background:var(--gray-200);color:var(--gray-500);padding:3px 10px;border-radius:3px;font-size:11px">${s.toUpperCase()}</span>`;
             }).join('')}
         </div>`
      : `<div class="alert-banner warn" style="margin-bottom:12px">⚠️ No PDFs uploaded to cloud storage yet.</div>`;

    modalBody.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
        <div style="background:var(--gray-100);border-radius:6px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--gray-500)">Risk Score</div>
          <div style="font-family:'Rajdhani';font-size:24px;font-weight:700;color:${ar.risk_score >= 60 ? 'var(--red-flag)' : ar.risk_score >= 30 ? 'var(--amber)' : 'var(--green-india)'}">${ar.risk_score}/100</div>
        </div>
        <div style="background:var(--gray-100);border-radius:6px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--gray-500)">Students</div>
          <div style="font-family:'Rajdhani';font-size:24px;font-weight:700">${ar.inst_stats?.total_students || '—'}</div>
        </div>
        <div style="background:var(--gray-100);border-radius:6px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--gray-500)">NAAC Grade</div>
          <div style="font-family:'Rajdhani';font-size:24px;font-weight:700">${ar.inst_stats?.naac_grade || '—'}</div>
        </div>
      </div>
      ${(ar.risk_factors || []).length > 0 ? `<div class="alert-banner danger" style="margin-bottom:12px"><b>Risk Factors:</b><br>${ar.risk_factors.slice(0, 3).map(f => '⚠️ ' + f).join('<br>')}</div>` : ''}
      ${pdfStrip}
      <div style="font-weight:700;font-size:14px;margin-bottom:8px">Section-wise Review Decision:</div>
      <div style="overflow-x:auto">
        <table class="data-table" style="margin-bottom:16px;min-width:600px">
          <thead><tr><th>Section</th><th>Key Data</th><th>PDF</th><th>Decision</th><th>Notes</th></tr></thead>
          <tbody>${secRows}</tbody>
        </table>
      </div>
      <div class="form-group">
        <label>Overall Authority Notes / Reason</label>
        <textarea id="reviewNotes" rows="3"
          placeholder="Provide detailed notes for institution. If rejecting, explain what needs to be fixed."
          style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:4px;font-family:'Noto Sans';font-size:13px;resize:vertical"></textarea>
      </div>`;
  } catch (e) {
    modalBody.innerHTML = '<div style="color:var(--red-flag)">Error loading application details.</div>';
    console.error(e);
  }
}

function viewPDF(url) {
  if (!url) { showToast('PDF not available.', 'red'); return; }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('open');
  currentReviewApprovalId = null;
}

async function submitReview(action) {
  if (!currentReviewApprovalId) return;
  const notes = document.getElementById('reviewNotes')?.value?.trim() || '';
  const sectionDecisions = {};
  for (const sec of ALL_SECTIONS) {
    const statusEl = document.getElementById(`secDec-${sec}-status`);
    const notesEl  = document.getElementById(`secDec-${sec}-notes`);
    if (statusEl) sectionDecisions[sec] = { status: statusEl.value, notes: notesEl?.value?.trim() || '' };
  }
  const btn = document.getElementById(action === 'approve' ? 'approveBtn' : 'rejectBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Processing...';
  try {
    const res = await fetch(`${API}/authority/review/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_id: currentReviewApprovalId, action, notes, section_decisions: sectionDecisions })
    });
    const data = await res.json();
    if (!res.ok) { showToast('❌ ' + (data.error || 'Review failed'), 'red'); return; }
    showToast(`✅ Application ${action === 'approve' ? 'APPROVED' : 'REJECTED'} successfully!`, 'green');
    closeReviewModal();
    loadPendingReviews('');
    loadAuthorityData();
  } catch (e) {
    showToast('Error: ' + e.message, 'red');
  } finally {
    btn.disabled = false;
    btn.textContent = action === 'approve' ? '✅ Approve Application' : '❌ Reject Application';
  }
}

// ── All Institutions ──────────────────────────────────
function renderAuthInstitutions() {
  const body           = document.getElementById('authInstBody');
  const search         = document.getElementById('authSearch').value.toLowerCase();
  const riskFilter     = document.getElementById('authRiskFilter').value;
  const approvalFilter = document.getElementById('authApprovalFilter').value;

  const filtered = allInstitutions.filter(i => {
    const matchSearch   = !search || i.institution_name.toLowerCase().includes(search) || (i.state || '').toLowerCase().includes(search);
    const matchRisk     = !riskFilter || i.risk_level === riskFilter;
    const matchApproval = !approvalFilter || i.approval_status === approvalFilter;
    return matchSearch && matchRisk && matchApproval;
  });

  document.getElementById('authInstCount').textContent = filtered.length + ' Institutions';
  if (!filtered.length) {
    body.innerHTML = '<div style="color:var(--gray-500);text-align:center;padding:32px">No institutions found.</div>';
    return;
  }
  body.innerHTML = `<table class="data-table">
    <thead><tr><th>Institution</th><th>State</th><th>Students</th><th>Faculty</th><th>Labs</th><th>Risk</th><th>Score</th><th>Approval</th></tr></thead>
    <tbody>${filtered.map(i => `<tr>
      <td><b>${i.institution_name}</b><br><small style="color:var(--gray-500)">${i.aicte_id || '—'}</small></td>
      <td>${i.state}</td>
      <td>${i.total_students || '—'}</td><td>${i.total_faculty || '—'}</td><td>${i.total_labs || '—'}</td>
      <td><span class="badge badge-${(i.risk_level || 'pending').toLowerCase().replace(' ', '-')}">${i.risk_level || 'Not Analyzed'}</span></td>
      <td><b style="font-family:'Rajdhani';font-size:18px;color:${i.risk_score >= 60 ? 'var(--red-flag)' : i.risk_score >= 30 ? 'var(--amber)' : 'var(--green-india)'}">${i.risk_score || 0}</b></td>
      <td><span class="badge badge-${i.approval_status === 'approved' ? 'approved' : i.approval_status === 'rejected' ? 'rejected' : 'pending'}">${i.approval_status || 'pending'}</span></td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function filterAuthTable() { renderAuthInstitutions(); }

// ── Analytics ─────────────────────────────────────────
function renderAuthAnalytics() {
  const byState    = {};
  const byRisk     = { Low: 0, Medium: 0, High: 0 };
  const byApproval = { pending: 0, approved: 0, rejected: 0 };

  allInstitutions.forEach(i => {
    byState[i.state] = (byState[i.state] || 0) + 1;
    if (i.risk_level)     byRisk[i.risk_level]         = (byRisk[i.risk_level] || 0) + 1;
    if (i.approval_status) byApproval[i.approval_status] = (byApproval[i.approval_status] || 0) + 1;
  });

  setTimeout(() => {
    makeChart('analyticsRiskChart', {
      type: 'doughnut',
      data: {
        labels: ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{ data: [byRisk.Low, byRisk.Medium, byRisk.High], backgroundColor: ['#138808', '#E8920A', '#D92B3A'], borderWidth: 2 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
    makeChart('analyticsStateChart', {
      type: 'bar',
      data: {
        labels: Object.keys(byState),
        datasets: [{ label: 'Institutions', data: Object.values(byState), backgroundColor: '#FF6B00' }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
  }, 100);
}

function buildAuthCharts(stats, insts) {
  makeChart('riskDistChart', {
    type: 'pie',
    data: {
      labels: ['Low', 'Medium', 'High'],
      datasets: [{ data: [stats.low_risk || 0, stats.medium_risk || 0, stats.high_risk || 0], backgroundColor: ['#138808', '#E8920A', '#D92B3A'] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
  makeChart('approvalDistChart', {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Approved', 'Rejected'],
      datasets: [{ data: [stats.pending_approvals || 0, stats.approved || 0, stats.rejected || 0], backgroundColor: ['#E8920A', '#138808', '#D92B3A'], borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}
