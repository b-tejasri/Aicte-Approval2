/* ═══════════════════════════════════════════════════════
   js/dashboard.js — Institution Dashboard
   ═══════════════════════════════════════════════════════ */

async function loadDashboard() {
  if (!institutionId) return;
  try {
    const res = await fetch(`${API}/dashboard/?institution_id=${institutionId}`);
    if (!res.ok) return;
    const d = await res.json();
    dashboardData = d;
    uploadedSections = d.sections_uploaded || [];

    // Basic stats
    document.getElementById('dashSubtitle').textContent = (d.institution_name || '') + ' — ' + (d.aicte_id || 'No AICTE ID');
    document.getElementById('ds-uploads').textContent = uploadedSections.length;
    document.getElementById('ds-students').textContent = d.inst_data?.total_students || '—';
    document.getElementById('ds-faculty').textContent  = d.inst_data?.total_faculty  || '—';
    document.getElementById('ds-labs').textContent     = d.inst_data?.total_labs     || '—';
    document.getElementById('ds-risk').textContent     = d.risk_score ? d.risk_score + '/100' : '—';
    document.getElementById('ds-risk-level').textContent  = d.risk_level || 'Not Analyzed';
    document.getElementById('ds-approval-prob').textContent = d.approval_probability ? d.approval_probability + '%' : '—';
    document.getElementById('sidebarAicteId').textContent   = 'AICTE ID: ' + (d.aicte_id || '—');

    // Sidebar risk card
    if (d.risk_score > 0) {
      document.getElementById('sidebarRiskCard').style.display = 'block';
      const rc = d.risk_score >= 60 ? 'var(--red-flag)' : d.risk_score >= 30 ? 'var(--amber)' : 'var(--green-india)';
      document.getElementById('sidebarRiskScore').style.color = rc;
      document.getElementById('sidebarRiskScore').textContent = d.risk_score + '/100';
      document.getElementById('sidebarRiskLevel').textContent = d.risk_level || '';
    }

    // Sidebar approval card
    if (d.approval_status) {
      const ac = document.getElementById('sidebarApprovalCard');
      ac.style.display = 'block';
      const statusConfig = {
        pending:     { bg: '#FFF3CD', border: 'var(--amber)',       color: '#856404', text: '⏳ Pending' },
        approved:    { bg: '#D4EDDA', border: 'var(--green-india)', color: '#155724', text: '✅ Approved' },
        rejected:    { bg: '#F8D7DA', border: 'var(--red-flag)',    color: '#721C24', text: '❌ Rejected' },
        resubmitted: { bg: '#E0ECFF', border: '#1A5EBF',            color: '#0A3D9E', text: '🔄 Resubmitted' }
      };
      const cfg = statusConfig[d.approval_status] || { bg: 'var(--gray-100)', border: 'var(--border)', color: 'var(--navy)', text: d.approval_status };
      ac.style.background   = cfg.bg;
      ac.style.borderColor  = cfg.border;
      document.getElementById('sidebarApprovalLabel').style.color  = cfg.color;
      document.getElementById('sidebarApprovalStatus').textContent = cfg.text;
      document.getElementById('sidebarApprovalStatus').style.color = cfg.color;
    }

    renderApprovalBanner(d);
    _updateSubmitBtn(d);
    _updateRiskAlert(d);
    renderSectionScores(d);
    renderInfraBody(d);
    renderFacultyStats(d);
    renderAccredBody(d);
    renderRiskFactors(d);
    loadNotifBadge();

  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

function _updateSubmitBtn(d) {
  const submitBtn = document.getElementById('submitApprovalBtn');
  if (!submitBtn) return;

  if (d.approval_status === 'approved') {
    submitBtn.style.display = 'none';
  } else if (d.latest_approval && d.latest_approval.status === 'rejected') {
    submitBtn.style.display = 'inline-block';
    submitBtn.disabled = false;
    submitBtn.textContent = '🔄 Resubmit Application';
  } else if (d.latest_approval && ['submitted', 'under_review', 'pending'].includes(d.latest_approval.status)) {
    submitBtn.style.display = 'inline-block';
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Application Under Review';
  } else {
    submitBtn.style.display = 'inline-block';
    if (uploadedSections.length === 6) {
      submitBtn.disabled = false;
      submitBtn.textContent = '📨 Submit for Approval';
    } else {
      submitBtn.disabled = true;
      submitBtn.textContent = `Upload all 6 sections (${uploadedSections.length}/6)`;
    }
  }
}

function _updateRiskAlert(d) {
  const dashAlert = document.getElementById('dashAlert');
  if (d.risk_level === 'High') {
    dashAlert.style.display = 'flex';
    dashAlert.className = 'alert-banner danger';
    dashAlert.textContent = '🔴 High Risk: ' + ((d.risk_factors || [])[0] || '');
  } else if (d.risk_level === 'Medium') {
    dashAlert.style.display = 'flex';
    dashAlert.className = 'alert-banner warn';
    dashAlert.textContent = '⚠️ Medium Risk: ' + ((d.risk_factors || [])[0] || '');
  } else {
    dashAlert.style.display = 'none';
  }
}

// ── Approval Banner ───────────────────────────────────
function renderApprovalBanner(d) {
  const el = document.getElementById('dashApprovalBanner');
  if (!d.latest_approval) { el.innerHTML = ''; return; }
  const ar = d.latest_approval;
  const configs = {
    submitted:    { cls: 'submitted-banner',   icon: '📤', title: 'Application Submitted for Review',         msg: `Submitted on ${ar.submitted_at}. Awaiting AICTE authority review.` },
    under_review: { cls: 'submitted-banner',   icon: '🔍', title: 'Application Under Review',                 msg: `AICTE authority is reviewing your application.` },
    approved:     { cls: 'approved-banner',    icon: '✅', title: 'Application APPROVED by AICTE',            msg: `Your mandatory disclosure has been approved! ${ar.authority_notes || ''}` },
    rejected:     { cls: 'rejected-banner',    icon: '❌', title: 'Application REJECTED — Action Required',   msg: `Reason: ${ar.authority_notes || 'See section decisions below.'}` },
    resubmitted:  { cls: 'submitted-banner',   icon: '🔄', title: 'Application Resubmitted',                  msg: `Resubmitted for authority review.` },
  };
  const cfg = configs[ar.status] || { cls: 'submitted-banner', icon: '📝', title: ar.status, msg: '' };
  let sectionDecisions = '';
  if (ar.section_decisions && Object.keys(ar.section_decisions).length > 0) {
    sectionDecisions = '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">';
    for (const [sec, dec] of Object.entries(ar.section_decisions)) {
      const clr    = dec.status === 'approved' ? '#D4EDDA' : '#F8D7DA';
      const txtClr = dec.status === 'approved' ? '#155724' : '#721C24';
      sectionDecisions += `<div style="background:${clr};color:${txtClr};padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700">${sec.toUpperCase()}: ${dec.status} ${dec.notes ? '— ' + dec.notes : ''}</div>`;
    }
    sectionDecisions += '</div>';
  }
  el.innerHTML = `<div class="approval-banner ${cfg.cls}">
    <div>
      <div style="font-size:20px;font-weight:700;font-family:'Rajdhani'">${cfg.icon} ${cfg.title}</div>
      <div style="font-size:13px;margin-top:4px;color:var(--gray-700)">${cfg.msg}</div>
      ${sectionDecisions}
    </div>
    ${ar.status === 'rejected' ? `<button class="btn btn-saffron btn-sm" onclick="navTo('upload-disclosures')">🔄 Re-upload PDFs</button>` : ''}
  </div>`;
}

// ── Section Scores ────────────────────────────────────
function renderSectionScores(d) {
  const el = document.getElementById('dashSectionBody');
  const ss = d.section_scores || {};
  const secDetails = d.section_details || {};
  if (!Object.keys(ss).length && !Object.keys(secDetails).length) {
    el.innerHTML = '<div style="color:var(--gray-500);font-size:12px">Upload PDFs to see section scores.</div>';
    return;
  }
  let html = '';
  for (const sec of Object.keys(SECTION_LABELS)) {
    const details = secDetails[sec];
    const pts = ss[sec] || 0;
    const maxPts = { faculty: 40, labs: 15, infrastructure: 60, students: 10, financials: 8, accreditation: 33 }[sec] || 20;
    const pct = Math.max(0, 100 - Math.round((pts / maxPts) * 100));
    const clr = pct >= 70 ? 'var(--green-india)' : pct >= 40 ? 'var(--amber)' : 'var(--red-flag)';
    const reviewBadge = details
      ? `<span class="badge badge-${details.review_status || 'pending'}" style="font-size:10px">${details.review_status || 'pending'}</span>`
      : '<span style="font-size:10px;color:var(--gray-500)">Not uploaded</span>';
    html += `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;font-weight:600">${SECTION_LABELS[sec]}</span>
        <div style="display:flex;gap:6px;align-items:center">${reviewBadge}<span style="font-size:11px;color:${clr};font-weight:700">−${pts}pts</span></div>
      </div>
      <div class="cr-bar"><div class="cr-fill" style="width:${pct}%;background:${clr}"></div></div>
    </div>`;
  }
  el.innerHTML = html;
}

// ── Infrastructure Body ───────────────────────────────
function renderInfraBody(d) {
  const el = document.getElementById('dashInfraBody');
  const id = d.inst_data || {};
  if (!id.total_students && !id.total_faculty) {
    el.innerHTML = '<div style="color:var(--gray-500);font-size:12px">Upload infrastructure PDF to see details.</div>';
    return;
  }
  el.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    ${[['👨‍🏫','Faculty',id.total_faculty],['👨‍🎓','Students',id.total_students],
       ['🔬','Labs',id.total_labs],['🏫','Classrooms',id.total_classrooms],
       ['📚','Library Books',(id.library_books||0).toLocaleString()],
       ['💻','Computers',id.computer_count],
       ['📐','Area (sqft)',(id.total_area_sqft||0).toLocaleString()],
       ['🏠','Hostel Capacity',id.hostel_capacity]]
      .map(([ico, lbl, val]) => `<div style="background:var(--gray-100);border-radius:6px;padding:10px;display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">${ico}</span>
        <div><div style="font-size:10px;color:var(--gray-500)">${lbl}</div>
        <div style="font-family:'Rajdhani';font-size:20px;font-weight:700;color:var(--navy)">${val || '—'}</div></div>
      </div>`).join('')}
  </div>`;
}

// ── Faculty Stats ─────────────────────────────────────
function renderFacultyStats(d) {
  const el = document.getElementById('dashFacultyStats');
  const id = d.inst_data || {};
  if (!id.total_faculty) {
    el.innerHTML = '<div style="color:var(--gray-500);font-size:12px">Upload faculty PDF to see statistics.</div>';
    return;
  }
  const phdPct  = id.total_faculty > 0 ? Math.round((id.faculty_phd_count / id.total_faculty) * 100) : 0;
  const ratio   = id.total_students > 0 && id.total_faculty > 0 ? (id.total_students / id.total_faculty).toFixed(1) : 'N/A';
  const shortage = Math.max(0, (id.required_faculty || 0) - id.total_faculty);
  const names   = (id.faculty_details || []).map(f => (f.name || '').toLowerCase().trim()).filter(n => n);
  const dups    = names.length - new Set(names).size;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--gray-100);border-radius:6px;padding:10px">
        <div style="font-size:10px;color:var(--gray-500)">Total Faculty</div>
        <div style="font-family:'Rajdhani';font-size:24px;font-weight:700">${id.total_faculty}</div>
      </div>
      <div style="background:${shortage > 0 ? '#F8D7DA' : '#D4EDDA'};border-radius:6px;padding:10px">
        <div style="font-size:10px;color:var(--gray-500)">Shortage</div>
        <div style="font-family:'Rajdhani';font-size:24px;font-weight:700;color:${shortage > 0 ? 'var(--red-flag)' : 'var(--green-india)'}">${shortage > 0 ? '-' + shortage : 'None'}</div>
      </div>
      <div style="background:${phdPct >= 30 ? '#D4EDDA' : '#FFF3CD'};border-radius:6px;padding:10px">
        <div style="font-size:10px;color:var(--gray-500)">PhD %</div>
        <div style="font-family:'Rajdhani';font-size:24px;font-weight:700;color:${phdPct >= 30 ? 'var(--green-india)' : 'var(--amber)'}">${phdPct}%</div>
      </div>
      <div style="background:${parseFloat(ratio) <= 15 ? '#D4EDDA' : '#F8D7DA'};border-radius:6px;padding:10px">
        <div style="font-size:10px;color:var(--gray-500)">Student:Faculty Ratio</div>
        <div style="font-family:'Rajdhani';font-size:24px;font-weight:700;color:${parseFloat(ratio) <= 15 ? 'var(--green-india)' : 'var(--red-flag)'}">1:${ratio}</div>
      </div>
    </div>
    ${dups > 0 ? `<div class="alert-banner warn">⚠️ Duplicate Faculty Detection: ${dups} duplicate name(s) found in faculty list. Please audit and correct.</div>` : ''}`;
}

// ── Accreditation Body ────────────────────────────────
function renderAccredBody(d) {
  const el = document.getElementById('dashAccredBody');
  const id = d.inst_data || {};
  if (!id.naac_grade && !id.nba_programs && !id.iso_certified) {
    el.innerHTML = '<div style="color:var(--gray-500);font-size:12px">Upload accreditation PDF to see status.</div>';
    return;
  }
  el.innerHTML = `<table class="ai-data-table">
    <thead><tr><th>Accreditation</th><th>Status</th><th>Details</th></tr></thead>
    <tbody>
      <tr><td>NAAC Grade</td><td>${id.naac_grade ? `<span class="badge badge-approved">${id.naac_grade}</span>` : '<span class="badge badge-rejected">Not Found</span>'}</td><td>${id.naac_grade ? 'NAAC Accredited' : 'Upload accreditation PDF'}</td></tr>
      <tr><td>NBA Programs</td><td>${id.nba_programs ? `<span class="badge badge-approved">Accredited</span>` : '<span class="badge badge-pending">Not Found</span>'}</td><td>${id.nba_programs || '—'}</td></tr>
      <tr><td>ISO 9001:2015</td><td>${id.iso_certified ? `<span class="badge badge-approved">Certified</span>` : '<span class="badge badge-pending">Not Certified</span>'}</td><td>${id.iso_certified ? 'Quality management certified' : '—'}</td></tr>
      <tr><td>Annual Budget</td><td>${id.annual_budget > 0 ? `<span class="badge badge-approved">Available</span>` : '<span class="badge badge-rejected">Missing</span>'}</td><td>${id.annual_budget > 0 ? '₹' + id.annual_budget + ' Lakhs' : 'Upload financial PDF'}</td></tr>
    </tbody>
  </table>`;
}

// ── Risk Factors ──────────────────────────────────────
function renderRiskFactors(d) {
  const rf = d.risk_factors || [];
  if (rf.length > 0) {
    document.getElementById('dashRiskCard').style.display = 'block';
    const badge = document.getElementById('dashRiskBadge');
    badge.textContent = d.risk_level;
    badge.className = 'badge badge-' + (d.risk_level || 'low').toLowerCase();
    document.getElementById('dashRiskFactors').innerHTML = rf.map((f, i) => `
      <div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--gray-200);align-items:flex-start">
        <span style="background:var(--red-flag);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${i + 1}</span>
        <span style="font-size:12px;color:var(--gray-700)">${f}</span>
      </div>`).join('');
  }
  const sg = d.suggestions || [];
  if (sg.length > 0) {
    document.getElementById('dashSuggestCard').style.display = 'block';
    document.getElementById('dashSuggestions').innerHTML = sg.map((s, i) => `
      <div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--gray-200);align-items:flex-start">
        <span style="background:var(--green-india);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${i + 1}</span>
        <span style="font-size:12px;color:var(--navy)">${s}</span>
      </div>`).join('');
  }
}
