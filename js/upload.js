/* ═══════════════════════════════════════════════════════
   js/upload.js — PDF Upload & Processing
   ═══════════════════════════════════════════════════════ */

// ── Build Upload Grid ─────────────────────────────────
function buildUploadGrid() {
  const grid = document.getElementById('uploadSectionsGrid');
  const secDetails = dashboardData.section_details || {};

  grid.innerHTML = SECTION_DEFS.map(sec => {
    const details    = secDetails[sec.key];
    const done       = uploadedSections.includes(sec.key);
    const isRejected = details && details.review_status === 'rejected';
    const isApproved = details && details.review_status === 'approved';

    let statusText  = '⬜ Not uploaded yet';
    let statusClass = 'pending-status';
    if (done && isApproved)  { statusText = '✅ Approved by AICTE';           statusClass = 'uploaded'; }
    else if (done && isRejected) { statusText = '❌ Rejected — Re-upload required'; statusClass = 'rejected-status'; }
    else if (done)           { statusText = '✅ Uploaded & Analyzed';         statusClass = 'uploaded'; }

    let btnClass = 'primary';
    let btnText  = done ? '🔄 Re-upload PDF' : '📤 Upload PDF';
    if (isRejected) { btnClass = 'danger-btn'; btnText = '🔄 Re-upload (Fix Required)'; }
    else if (isApproved) { btnClass = 'success-btn'; btnText = '🔄 Re-upload'; }

    const sectionScore = details
      ? `<div style="font-size:10px;color:var(--gray-500);margin-bottom:6px">Section risk: <b>${details.section_score || 0} pts</b></div>`
      : '';
    const rejNotes = isRejected && details.review_notes
      ? `<div class="alert-banner danger" style="font-size:11px;padding:6px 10px;margin-bottom:8px">❌ ${details.review_notes}</div>`
      : '';

    return `
      <div class="section-upload-card ${done ? 'done' : ''} ${isRejected ? 'rejected-card' : ''}" id="sucard-${sec.key}">
        <div class="su-icon">${sec.icon}</div>
        <h4>${sec.title}</h4>
        <p>${sec.desc}</p>
        ${sectionScore}
        <div class="su-status ${statusClass}" id="sustatus-${sec.key}">${statusText}</div>
        ${rejNotes}
        <button class="upload-btn ${btnClass}" id="subtn-${sec.key}" onclick="triggerUpload('${sec.key}')">${btnText}</button>
      </div>`;
  }).join('');
}

function triggerUpload(sectionKey) {
  currentUploadSection = sectionKey;
  document.getElementById('hiddenFileInput').value = '';
  document.getElementById('hiddenFileInput').click();
}

// ── Handle File Selected ──────────────────────────────
async function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file || !currentUploadSection) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('❌ Only PDF files accepted.', 'red');
    return;
  }

  const progress   = document.getElementById('uploadProgress');
  const resultCard = document.getElementById('uploadResultCard');
  const btn        = document.getElementById(`subtn-${currentUploadSection}`);

  progress.style.display = 'flex';
  progress.innerHTML = `<span class="loading-spinner spin-orange" style="flex-shrink:0"></span>
    Uploading "<b>${file.name}</b>" for <b>${currentUploadSection}</b>… AI analyzing, please wait.`;
  resultCard.style.display = 'none';
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading-spinner" style="border-top-color:var(--saffron)"></span> Analyzing...'; }

  // Step 1: AI extraction
  const formData = new FormData();
  formData.append('institution_id', institutionId);
  formData.append('section_type',   currentUploadSection);
  formData.append('academic_year',  '2024-25');
  formData.append('pdf_file',       file);

  try {
    const res  = await fetch(`${API}/upload/`, { method: 'POST', body: formData });
    const data = await res.json();
    progress.style.display = 'none';

    if (!res.ok) {
      showToast('❌ Upload failed: ' + (data.error || 'Unknown error'), 'red');
      if (btn) { btn.disabled = false; btn.textContent = '📤 Upload PDF'; }
      return;
    }

    // Step 2: S3 upload
    progress.style.display = 'flex';
    progress.innerHTML = `<span class="loading-spinner spin-orange" style="flex-shrink:0"></span> Saving PDF to secure cloud storage…`;

    const s3Form = new FormData();
    s3Form.append('institution_id', institutionId);
    s3Form.append('section_type',   currentUploadSection);
    s3Form.append('pdf_file',       file);

    let s3Url = '';
    try {
      const s3Res  = await fetch(`${API}/upload-s3/`, { method: 'POST', body: s3Form });
      const s3Data = await s3Res.json();
      if (s3Res.ok) {
        s3Url = s3Data.s3_url || '';
        showToast('☁️ PDF saved to cloud storage.', 'green');
      } else {
        console.warn('S3 upload failed:', s3Data.error);
        showToast('⚠️ AI done, but cloud save failed. Try again.', 'red');
      }
    } catch (s3Err) {
      console.warn('S3 upload error:', s3Err.message);
    }
    progress.style.display = 'none';

    // Step 3: Update UI
    if (!uploadedSections.includes(currentUploadSection))
      uploadedSections.push(currentUploadSection);

    const card   = document.getElementById(`sucard-${currentUploadSection}`);
    const status = document.getElementById(`sustatus-${currentUploadSection}`);
    if (card)   { card.classList.add('done'); card.classList.remove('rejected-card'); }
    if (status) { status.textContent = '✅ Uploaded & Analyzed'; status.className = 'su-status uploaded'; }

    if (s3Url && card) {
      let existingLink = card.querySelector('.s3-link');
      if (!existingLink) {
        existingLink = document.createElement('div');
        existingLink.className = 's3-link';
        existingLink.style.cssText = 'margin-top:6px;font-size:11px';
        card.appendChild(existingLink);
      }
      existingLink.innerHTML = `☁️ <a href="${s3Url}" target="_blank" style="color:var(--saffron);font-weight:700">View Uploaded PDF ↗</a>`;
    }

    if (btn) { btn.textContent = '🔄 Re-upload PDF'; btn.className = 'upload-btn success-btn'; btn.disabled = false; }

    resultCard.style.display = 'block';
    document.getElementById('uploadResultBody').innerHTML = buildUploadResult(data);
    showToast('✅ ' + currentUploadSection.toUpperCase() + ' analyzed & saved!', 'green');
    loadDashboard();

  } catch (e) {
    progress.style.display = 'none';
    showToast('Server error: ' + e.message, 'red');
    if (btn) { btn.disabled = false; btn.textContent = '📤 Upload PDF'; }
  }
}

// ── Build Upload Result HTML ──────────────────────────
function buildUploadResult(data) {
  const aiData = data.ai_data || {};
  const risk   = data.risk    || {};
  const sec    = data.section_type;

  let rows = '';
  if (sec === 'faculty') {
    rows = `<tr><td>Total Faculty</td><td><b>${aiData.total_faculty || 0}</b></td></tr>
            <tr><td>Required Faculty</td><td>${aiData.required_faculty || 0}</td></tr>
            <tr><td>PhD Count</td><td>${aiData.faculty_phd_count || 0}</td></tr>`;
    const fd = aiData.faculty_details || [];
    if (fd.length) {
      rows += `<tr><td colspan="2"><b>Faculty List (${fd.length} records)</b></td></tr>`;
      fd.slice(0, 5).forEach(f => {
        rows += `<tr><td>${f.name || '—'} (${f.dept || '—'})</td><td>${f.qualification || '—'}, ${f.experience_years || 0} yrs</td></tr>`;
      });
      if (fd.length > 5) rows += `<tr><td colspan="2" style="color:var(--gray-500)">... and ${fd.length - 5} more</td></tr>`;
    }
  } else if (sec === 'labs') {
    rows = `<tr><td>Total Labs</td><td><b>${aiData.total_labs || 0}</b></td></tr>`;
    (aiData.lab_details || []).slice(0, 5).forEach(l => {
      rows += `<tr><td>${l.name || '—'} (${l.dept || '—'})</td><td>${l.area_sqft || 0} sqft, ${l.equipment_count || 0} equip</td></tr>`;
    });
  } else if (sec === 'infrastructure') {
    rows = `<tr><td>Classrooms</td><td>${aiData.total_classrooms || 0}</td></tr>
            <tr><td>Library Books</td><td>${(aiData.library_books || 0).toLocaleString()}</td></tr>
            <tr><td>Computers</td><td>${aiData.computer_count || 0}</td></tr>
            <tr><td>Total Area (sqft)</td><td>${(aiData.total_area_sqft || 0).toLocaleString()}</td></tr>
            <tr><td>Hostel Capacity</td><td>${aiData.hostel_capacity || 0}</td></tr>`;
  } else if (sec === 'students') {
    rows = `<tr><td>Total Students</td><td><b>${aiData.total_students || 0}</b></td></tr>
            <tr><td>UG Students</td><td>${aiData.ug_students || 0}</td></tr>
            <tr><td>PG Students</td><td>${aiData.pg_students || 0}</td></tr>
            <tr><td>Programs Offered</td><td>${(aiData.programs_offered || []).join(', ') || '—'}</td></tr>`;
  } else if (sec === 'financials') {
    rows = `<tr><td>Annual Budget</td><td>₹${aiData.annual_budget || 0} Lakhs</td></tr>
            <tr><td>UG Fee</td><td>₹${(aiData.fee_structure?.ug_fee || 0).toLocaleString()}</td></tr>
            <tr><td>PG Fee</td><td>₹${(aiData.fee_structure?.pg_fee || 0).toLocaleString()}</td></tr>`;
  } else if (sec === 'accreditation') {
    rows = `<tr><td>NAAC Grade</td><td>${aiData.naac_grade || '—'}</td></tr>
            <tr><td>NBA Programs</td><td>${aiData.nba_programs || '—'}</td></tr>
            <tr><td>ISO Certified</td><td>${aiData.iso_certified ? 'Yes' : 'No'}</td></tr>`;
  }

  const clr = risk.risk_score >= 60 ? 'var(--red-flag)' : risk.risk_score >= 30 ? 'var(--amber)' : 'var(--green-india)';
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div>
      <b style="font-family:'Rajdhani';font-size:14px">📊 Extracted Data — ${sec.toUpperCase()}</b>
      <table class="ai-data-table" style="margin-top:8px">
        <thead><tr><th>Field</th><th>Value</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="2" style="color:var(--gray-500)">No data extracted — defaults applied. Upload the correct PDF for this section.</td></tr>'}</tbody>
      </table>
    </div>
    <div>
      <b style="font-family:'Rajdhani';font-size:14px">🤖 Updated Risk Score</b>
      <div style="margin-top:12px;text-align:center">
        <div class="risk-score-big" style="color:${clr}">${risk.risk_score || 0}</div>
        <div style="font-size:12px;color:var(--gray-500)">/100</div>
        <div class="badge badge-${(risk.risk_level || 'low').toLowerCase()}" style="margin-top:8px;font-size:13px;padding:6px 14px">${risk.risk_level || 'Low'}</div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:6px">Approval Probability: ${risk.approval_probability || 0}%</div>
      </div>
      ${(risk.risk_factors || []).length > 0 ? `<div style="margin-top:12px">${risk.risk_factors.slice(0, 3).map(f => `<div style="font-size:11px;color:var(--gray-700);padding:4px 0;border-bottom:1px solid var(--gray-200)">⚠️ ${f}</div>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

// ── Submit for Approval ───────────────────────────────
async function submitForApproval() {
  if (!institutionId) return;
  if (uploadedSections.length !== 6) {
    showToast('Upload all 6 mandatory sections before submission.', 'red');
    return;
  }
  if (!confirm('Submit all uploaded disclosure PDFs for AICTE authority review?\n\nAfter submission you cannot modify unless rejected.')) return;

  const btn = document.getElementById('submitApprovalBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Submitting...';

  try {
    const res = await fetch(`${API}/submit-approval/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution_id: institutionId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('❌ ' + (data.error || 'Submission failed'), 'red');
      btn.disabled = false;
      btn.textContent = '📨 Submit for Approval';
      return;
    }
    showToast('✅ Application submitted successfully!', 'green');
    loadDashboard();
    navTo('approval-status');
  } catch (e) {
    showToast('Server error: ' + e.message, 'red');
    btn.disabled = false;
    btn.textContent = '📨 Submit for Approval';
  }
}

// ── Download Excel ────────────────────────────────────
async function downloadExcel() {
  if (!institutionId) { showToast('Please log in first.', 'red'); return; }
  const btns = document.querySelectorAll('[onclick="downloadExcel()"]');
  btns.forEach(b => { b.disabled = true; b._t = b.innerHTML; b.innerHTML = '⏳ Generating...'; });
  try {
    const res = await fetch(`${API}/download-excel/?institution_id=${institutionId}`);
    if (!res.ok) { showToast('Download failed', 'red'); return; }
    const cd       = res.headers.get('Content-Disposition') || '';
    const match    = cd.match(/filename="(.+)"/);
    const filename = match ? match[1] : `AICTE_Report_${institutionId}.xlsx`;
    const blob     = await res.blob();
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast('✅ Downloaded: ' + filename, 'green');
  } catch (e) {
    showToast('Error: ' + e.message, 'red');
  } finally {
    btns.forEach(b => { b.disabled = false; if (b._t) b.innerHTML = b._t; });
  }
}
