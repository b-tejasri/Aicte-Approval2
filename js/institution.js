/* ═══════════════════════════════════════════════════════
   js/institution.js — My Disclosures, AI Risk, Approval
                        Notifications, Profile
   ═══════════════════════════════════════════════════════ */

// ── My Disclosures ────────────────────────────────────
async function loadDisclosures() {
  if (!institutionId) return;
  const body = document.getElementById('disclosuresTableBody');
  body.innerHTML = '<div style="padding:20px;color:var(--gray-500)">Loading...</div>';
  try {
    const res  = await fetch(`${API}/disclosures/?institution_id=${institutionId}`);
    const data = await res.json();
    document.getElementById('discTotalBadge').textContent = data.length + ' Uploads';
    if (!data.length) {
      body.innerHTML = '<div style="color:var(--gray-500);text-align:center;padding:32px">No disclosures uploaded yet.</div>';
      return;
    }
    body.innerHTML = `<table class="data-table">
      <thead><tr><th>Section</th><th>Year</th><th>Status</th><th>Review</th><th>Section Score</th><th>Uploaded</th><th>Key Data</th></tr></thead>
      <tbody>${data.map(d => {
        const ai = d.ai_data || {};
        let keyData = '';
        if (d.section_type === 'faculty')        keyData = `Faculty: ${ai.total_faculty || 0}, PhD: ${ai.faculty_phd_count || 0}`;
        else if (d.section_type === 'labs')       keyData = `Labs: ${ai.total_labs || 0}`;
        else if (d.section_type === 'students')   keyData = `Students: ${ai.total_students || 0}`;
        else if (d.section_type === 'infrastructure') keyData = `Classrooms: ${ai.total_classrooms || 0}, Lib: ${(ai.library_books || 0).toLocaleString()}`;
        else if (d.section_type === 'financials') keyData = `Budget: ₹${ai.annual_budget || 0}L`;
        else if (d.section_type === 'accreditation') keyData = `NAAC: ${ai.naac_grade || '—'}`;
        const riskBadge   = d.risk ? `<span class="badge badge-${(d.risk.level || 'low').toLowerCase()}">${d.risk.level} (${d.risk.score})</span>` : '<span class="badge">N/A</span>';
        const reviewBadge = `<span class="badge badge-${d.review_status || 'pending'}">${d.review_status || 'pending'}</span>${d.review_notes ? `<div style="font-size:10px;color:var(--gray-500);margin-top:2px">${d.review_notes}</div>` : ''}`;
        const sectionPts  = d.risk?.section_score || 0;
        return `<tr>
          <td><b>${d.section_type.toUpperCase()}</b></td>
          <td>${d.academic_year}</td>
          <td><span class="badge badge-analyzed">${d.status}</span></td>
          <td>${reviewBadge}</td>
          <td><span style="font-family:'Rajdhani';font-size:16px;color:${sectionPts > 15 ? 'var(--red-flag)' : sectionPts > 5 ? 'var(--amber)' : 'var(--green-india)'}">${sectionPts > 0 ? '-' + sectionPts + ' pts' : '✅ 0 pts'}</span></td>
          <td style="font-size:11px;color:var(--gray-500)">${d.uploaded_at}</td>
          <td style="font-size:11px">${keyData}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch (e) {
    body.innerHTML = '<div style="color:var(--red-flag);padding:20px">Error loading disclosures.</div>';
  }
}

// ── AI Risk Page ──────────────────────────────────────
async function loadAIRisk() {
  if (!institutionId) return;
  const container = document.getElementById('aiRiskContent');
  container.innerHTML = '<div style="text-align:center;padding:40px"><div class="loading-spinner spin-orange" style="width:36px;height:36px;border-width:4px"></div></div>';

  try {
    const res = await fetch(`${API}/ai-risk/?institution_id=${institutionId}`);
    if (res.status === 404) {
      container.innerHTML = `<div style="text-align:center;padding:60px;color:var(--gray-500)">
        <div style="font-size:48px;margin-bottom:16px">🤖</div>
        <div style="font-size:18px;font-family:'Rajdhani';color:var(--navy)">No Risk Analysis Yet</div>
        <div style="margin-top:8px">Upload at least one mandatory disclosure PDF.</div></div>`;
      return;
    }
    const d   = await res.json();
    const clr = d.risk_score >= 60 ? 'var(--red-flag)' : d.risk_score >= 30 ? 'var(--amber)' : 'var(--green-india)';
    const lvl = (d.risk_level || 'low').toLowerCase();

    // Section breakdown
    const sb = d.section_breakdown || {};
    let sbHtml = `<table class="data-table"><thead><tr><th>Section</th><th>Uploaded</th><th>Review Status</th><th>Risk Pts</th><th>Key Data</th></tr></thead><tbody>`;
    for (const sec of ALL_SECTIONS) {
      const info = sb[sec];
      if (!info) { sbHtml += `<tr><td><b>${sec.toUpperCase()}</b></td><td colspan="4" style="color:var(--gray-500)">Not uploaded</td></tr>`; continue; }
      const pts = (d.section_scores || {})[sec] || 0;
      const ai  = info.ai_data || {};
      let brief = '';
      if (sec === 'faculty')        brief = `Faculty: ${ai.total_faculty || 0}, PhD: ${ai.faculty_phd_count || 0}`;
      else if (sec === 'labs')       brief = `Labs: ${ai.total_labs || 0}`;
      else if (sec === 'students')   brief = `Students: ${ai.total_students || 0}`;
      else if (sec === 'infrastructure') brief = `Classrooms: ${ai.total_classrooms || 0}`;
      else if (sec === 'financials') brief = `Budget: ₹${ai.annual_budget || 0}L`;
      else if (sec === 'accreditation') brief = `NAAC: ${ai.naac_grade || '—'}`;
      sbHtml += `<tr>
        <td><b>${sec.toUpperCase()}</b></td>
        <td style="font-size:11px">${info.uploaded_at}</td>
        <td><span class="badge badge-${info.review_status || 'pending'}">${info.review_status || 'pending'}</span></td>
        <td><span style="font-family:'Rajdhani';font-size:16px;color:${pts > 15 ? 'var(--red-flag)' : pts > 5 ? 'var(--amber)' : 'var(--green-india)'}">${pts > 0 ? '-' + pts : ' ✅'}</span></td>
        <td style="font-size:11px">${brief}</td>
      </tr>`;
    }
    sbHtml += '</tbody></table>';

    // Faculty stats
    const fs = d.faculty_stats || {};
    const fHtml = fs.total_faculty
      ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          <div style="background:var(--gray-100);border-radius:6px;padding:10px;text-align:center"><div style="font-size:10px;color:var(--gray-500)">Total Faculty</div><div style="font-family:'Rajdhani';font-size:22px;font-weight:700">${fs.total_faculty}</div></div>
          <div style="background:${fs.shortage > 0 ? '#F8D7DA' : '#D4EDDA'};border-radius:6px;padding:10px;text-align:center"><div style="font-size:10px;color:var(--gray-500)">Shortage</div><div style="font-family:'Rajdhani';font-size:22px;font-weight:700;color:${fs.shortage > 0 ? 'var(--red-flag)' : 'var(--green-india)'}">${fs.shortage > 0 ? fs.shortage : 'None'}</div></div>
          <div style="background:${fs.phd_pct >= 30 ? '#D4EDDA' : '#FFF3CD'};border-radius:6px;padding:10px;text-align:center"><div style="font-size:10px;color:var(--gray-500)">PhD %</div><div style="font-family:'Rajdhani';font-size:22px;font-weight:700;color:${fs.phd_pct >= 30 ? 'var(--green-india)' : 'var(--amber)'}">${fs.phd_pct}%</div></div>
        </div>`
      : '<div style="color:var(--gray-500);font-size:12px">Upload faculty PDF to see statistics.</div>';

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:260px 1fr;gap:16px;margin-bottom:16px">
        <div class="card">
          <div class="card-header"><h3>Risk Score</h3></div>
          <div class="card-body risk-circle-wrap">
            <div class="risk-score-big" style="color:${clr}">${d.risk_score}</div>
            <div style="font-size:12px;color:var(--gray-500);margin-bottom:10px">/ 100</div>
            <span class="badge badge-${lvl}" style="font-size:14px;padding:6px 16px">${d.risk_level}</span>
            <div style="margin-top:14px;font-size:12px;color:var(--gray-500)">Compliance: <b>${Math.round(d.compliance_pct)}%</b></div>
            <div style="font-size:12px;color:var(--gray-500)">Faculty Ratio: <b>1:${d.faculty_ratio > 0 ? d.faculty_ratio.toFixed(1) : 'N/A'}</b></div>
            <div style="font-size:12px;margin-top:6px">Approval Probability: <b style="color:${d.approval_probability >= 60 ? 'var(--green-india)' : 'var(--amber)'}">${d.approval_probability || 0}%</b></div>
          </div>
        </div>
        <div>
          <div class="card" style="margin-bottom:12px">
            <div class="card-header"><h3>Risk Flags</h3></div>
            <div class="card-body">
              ${[['Faculty Shortage', d.faculty_shortage], ['Infrastructure Deficit', d.infra_deficit], ['Expired Certificates', d.expired_certs]]
                .map(([lbl, flag]) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-200)">
                  <span style="font-size:13px">${lbl}</span>
                  <span class="badge ${flag ? 'badge-rejected' : 'badge-approved'}">${flag ? '⚠️ Issue Found' : '✅ OK'}</span>
                </div>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Faculty Compliance Statistics</h3></div>
            <div class="card-body">${fHtml}</div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3>📋 Section-wise Breakdown</h3></div>
        <div class="card-body-sm">${sbHtml}</div>
      </div>
      ${(d.risk_factors || []).length > 0 ? `<div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3>⚠️ Risk Factors & Drawbacks (${d.risk_factors.length})</h3></div>
        <div class="card-body">${d.risk_factors.map((f, i) => `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-200)">
          <span style="background:var(--red-flag);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${i + 1}</span>
          <span style="font-size:12px;color:var(--gray-700)">${f}</span>
        </div>`).join('')}</div>
      </div>` : ''}
      ${(d.suggestions || []).length > 0 ? `<div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3>💡 Suggested Actions</h3></div>
        <div class="card-body">${d.suggestions.map((s, i) => `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-200)">
          <span style="background:var(--green-india);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${i + 1}</span>
          <span style="font-size:12px;color:var(--navy)">${s}</span>
        </div>`).join('')}</div>
      </div>` : ''}
      ${(d.history || []).length > 0 ? `<div class="card">
        <div class="card-header"><h3>📅 Risk Analysis History</h3></div>
        <div class="card-body-sm"><table class="data-table">
          <thead><tr><th>Section</th><th>Risk Score</th><th>Level</th><th>Analyzed On</th></tr></thead>
          <tbody>${d.history.map(h => `<tr>
            <td>${h.section_type.toUpperCase()}</td>
            <td><b>${h.risk_score}/100</b></td>
            <td><span class="badge badge-${h.risk_level.toLowerCase()}">${h.risk_level}</span></td>
            <td style="font-size:11px;color:var(--gray-500)">${h.analyzed_at}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>` : ''}`;
  } catch (e) {
    container.innerHTML = '<div style="color:var(--red-flag);padding:20px">Error loading risk analysis.</div>';
  }
}

// ── Approval Status ───────────────────────────────────
async function loadApprovalStatus() {
  if (!institutionId) return;
  const container = document.getElementById('approvalStatusContent');
  container.innerHTML = '<div style="text-align:center;padding:40px"><div class="loading-spinner spin-orange" style="width:36px;height:36px;border-width:4px"></div></div>';
  try {
    const res = await fetch(`${API}/approval-status/?institution_id=${institutionId}`);
    const d   = await res.json();
    if (d.status === 'not_submitted') {
      container.innerHTML = `<div style="text-align:center;padding:60px;color:var(--gray-500)">
        <div style="font-size:48px;margin-bottom:16px">📝</div>
        <div style="font-size:18px;font-family:'Rajdhani';color:var(--navy);margin-bottom:8px">No Application Submitted Yet</div>
        <div>Upload all mandatory disclosure PDFs, then click <b>Submit for Approval</b> on the dashboard.</div>
        <button class="btn btn-saffron" style="margin-top:20px" onclick="navTo('upload-disclosures')">📁 Go to Upload</button>
      </div>`;
      return;
    }
    const statusConfig = {
      submitted:    { cls: 'submitted-banner', title: '⏳ Application Under AICTE Review',    color: '#0A3D9E' },
      under_review: { cls: 'submitted-banner', title: '🔍 Being Reviewed by AICTE Authority', color: '#856404' },
      approved:     { cls: 'approved-banner',  title: '✅ Application APPROVED',              color: '#155724' },
      rejected:     { cls: 'rejected-banner',  title: '❌ Application REJECTED',              color: '#721C24' },
      resubmitted:  { cls: 'submitted-banner', title: '🔄 Application Resubmitted',           color: '#0A3D9E' },
    }[d.status] || { cls: 'submitted-banner', title: d.status, color: 'var(--navy)' };

    let secDecHtml = '';
    if (d.section_decisions && Object.keys(d.section_decisions).length > 0) {
      secDecHtml = `<div class="card" style="margin-top:16px">
        <div class="card-header"><h3>Section-wise Decision</h3></div>
        <div class="card-body-sm"><table class="data-table">
          <thead><tr><th>Section</th><th>Decision</th><th>Authority Notes</th></tr></thead>
          <tbody>${Object.entries(d.section_decisions).map(([sec, dec]) => `<tr>
            <td><b>${sec.toUpperCase()}</b></td>
            <td><span class="badge badge-${dec.status || 'pending'}">${dec.status || 'pending'}</span></td>
            <td style="font-size:12px">${dec.notes || '—'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    }

    let histHtml = '';
    if ((d.history || []).length > 0) {
      histHtml = `<div class="card" style="margin-top:16px">
        <div class="card-header"><h3>Application History</h3></div>
        <div class="card-body-sm"><table class="data-table">
          <thead><tr><th>Submitted</th><th>Status</th><th>Risk Score</th><th>Reviewed On</th><th>Notes</th></tr></thead>
          <tbody>${d.history.map(h => `<tr>
            <td style="font-size:11px">${h.submitted_at}</td>
            <td><span class="badge badge-${h.status === 'approved' ? 'approved' : h.status === 'rejected' ? 'rejected' : 'pending'}">${h.status}</span></td>
            <td>${h.risk_score}/100</td>
            <td style="font-size:11px">${h.reviewed_at || '—'}</td>
            <td style="font-size:11px;color:var(--gray-500)">${h.authority_notes || '—'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    }

    container.innerHTML = `
      <div class="approval-banner ${statusConfig.cls}">
        <div>
          <div style="font-size:22px;font-weight:700;font-family:'Rajdhani';color:${statusConfig.color}">${statusConfig.title}</div>
          <div style="font-size:13px;margin-top:4px">Submitted: ${d.submitted_at} | Risk Score at Submission: ${d.risk_at_submission}/100</div>
          ${d.reviewed_at ? `<div style="font-size:13px">Reviewed on: ${d.reviewed_at} by ${d.reviewed_by}</div>` : ''}
          ${d.authority_notes ? `<div style="font-size:13px;margin-top:8px;font-style:italic;color:${statusConfig.color}">"${d.authority_notes}"</div>` : ''}
        </div>
        ${d.status === 'rejected' ? `<button class="btn btn-saffron" onclick="navTo('upload-disclosures')">🔄 Re-upload & Resubmit</button>` : ''}
        ${d.status === 'approved' ? `<button class="btn btn-navy btn-sm" onclick="downloadExcel()">📥 Download Certificate</button>` : ''}
      </div>
      <div class="card">
        <div class="card-header"><h3>Submitted Sections</h3></div>
        <div class="card-body"><div style="display:flex;gap:8px;flex-wrap:wrap">
          ${(d.sections || []).map(s => `<span class="badge badge-analyzed">${s.toUpperCase()}</span>`).join('')}
        </div></div>
      </div>
      ${secDecHtml}
      ${histHtml}`;
  } catch (e) {
    container.innerHTML = '<div style="color:var(--red-flag);padding:20px">Error loading approval status.</div>';
  }
}

// ── Notifications ─────────────────────────────────────
async function loadNotifications() {
  if (!institutionId) return;
  const body = document.getElementById('notifBody');
  try {
    const res  = await fetch(`${API}/notifications/?institution_id=${institutionId}`);
    const data = await res.json();
    const unread = data.filter(n => !n.is_read).length;
    document.getElementById('notifUnreadBadge').textContent = unread + ' Unread';
    if (!data.length) { body.innerHTML = '<div style="color:var(--gray-500);text-align:center;padding:32px">No notifications yet.</div>'; return; }
    const icons = { warning: '⚠️', success: '✅', danger: '🔴', info: 'ℹ️' };
    body.innerHTML = data.map(n => `
      <div class="notif-item">
        <div class="notif-icon ${n.notif_type}">${icons[n.notif_type] || '📢'}</div>
        <div style="flex:1">
          <div class="notif-title">${n.title}</div>
          <div class="notif-desc">${n.message}</div>
          <div class="notif-time">📅 ${n.created_at}</div>
        </div>
        ${!n.is_read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--saffron);flex-shrink:0;margin-top:4px"></div>' : ''}
      </div>`).join('');
  } catch (e) {
    body.innerHTML = '<div style="color:var(--red-flag);padding:20px">Error loading notifications.</div>';
  }
}

async function loadNotifBadge() {
  if (!institutionId) return;
  try {
    const res    = await fetch(`${API}/notifications/?institution_id=${institutionId}`);
    const data   = await res.json();
    const unread = data.filter(n => !n.is_read).length;
    const badge  = document.getElementById('notifBadgeTop');
    if (unread > 0) { badge.style.display = 'inline'; badge.textContent = unread; }
    else badge.style.display = 'none';
  } catch (e) {}
}

// ── Profile ───────────────────────────────────────────
async function loadProfile() {
  if (!institutionId) return;
  try {
    const res  = await fetch(`${API}/dashboard/?institution_id=${institutionId}`);
    const d    = await res.json();
    document.getElementById('profileName').textContent = d.institution_name;
    const riskClr = d.risk_score >= 60 ? 'var(--red-flag)' : d.risk_score >= 30 ? 'var(--amber)' : 'var(--green-india)';
    document.getElementById('profileBody').innerHTML = `
      <div>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <div style="width:64px;height:64px;background:var(--navy);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--white);font-family:'Rajdhani'">${(d.institution_name || 'I')[0]}</div>
          <div><div style="font-family:'Rajdhani';font-size:20px;font-weight:700">${d.institution_name}</div><div style="font-size:12px;color:var(--gray-500)">${d.inst_type} | ${d.state}</div></div>
        </div>
        ${[['AICTE ID', d.aicte_id || '—'], ['STATE', d.state || '—'], ['TYPE', d.inst_type || '—'], ['PRINCIPAL', d.principal_name || '—'], ['APPROVAL STATUS', d.approval_status || 'pending']]
          .map(([l, v]) => `<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--gray-500);font-weight:700;letter-spacing:.5px">${l}</div><div style="font-size:13px">${v}</div></div>`).join('')}
      </div>
      <div>
        ${[['TOTAL STUDENTS', d.inst_data?.total_students || '—'], ['TOTAL FACULTY', d.inst_data?.total_faculty || '—'], ['TOTAL LABS', d.inst_data?.total_labs || '—'], ['NAAC GRADE', d.inst_data?.naac_grade || '—'], ['SECTIONS UPLOADED', (d.sections_uploaded || []).join(', ') || 'None']]
          .map(([l, v]) => `<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--gray-500);font-weight:700;letter-spacing:.5px">${l}</div><div style="font-size:13px">${v}</div></div>`).join('')}
        <div style="margin-bottom:10px"><div style="font-size:10px;color:var(--gray-500);font-weight:700;letter-spacing:.5px">RISK SCORE</div>
          <div style="font-family:'Rajdhani';font-size:24px;font-weight:700;color:${riskClr}">${d.risk_score || 0}/100 — ${d.risk_level}</div></div>
        <div><div style="font-size:10px;color:var(--gray-500);font-weight:700;letter-spacing:.5px">APPROVAL PROBABILITY</div>
          <div style="font-family:'Rajdhani';font-size:24px;font-weight:700;color:var(--green-india)">${d.approval_probability || 0}%</div></div>
      </div>`;
  } catch (e) {}
}
