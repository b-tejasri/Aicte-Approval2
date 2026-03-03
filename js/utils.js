/* ═══════════════════════════════════════════════════════
   js/utils.js — Shared Utility Functions
   ═══════════════════════════════════════════════════════ */

// ── Error Display ─────────────────────────────────────
function showErr(el, msg) {
  el.style.display = 'flex';
  el.innerHTML = '❌ ' + msg;
}

// ── Toast Notification ────────────────────────────────
function showToast(msg, color) {
  const bg = color === 'green' ? '#138808' : '#D92B3A';
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;top:70px;right:20px;background:${bg};color:#fff;padding:12px 20px;
    border-radius:6px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3);
    max-width:380px;animation:slideIn .3s ease`;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4500);
}

// ── Chart Helper ──────────────────────────────────────
function makeChart(id, config) {
  if (chartInstances[id]) chartInstances[id].destroy();
  const el = document.getElementById(id);
  if (!el) return;
  chartInstances[id] = new Chart(el, config);
}

// ── Navigation ────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  document.getElementById('app').style.display = 'none';
  document.getElementById('app').classList.remove('active');
  const el = document.getElementById(id);
  if (el) { el.style.display = 'block'; el.classList.add('active'); }
  window.scrollTo(0, 0);
}

function switchTab(role) {
  if (role === 'authority') { showScreen('auth-login'); return; }
}

function navTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("'" + page + "'"))
      n.classList.add('active');
  });

  // Route to the correct load function
  if (page === 'inst-dashboard')     loadDashboard();
  else if (page === 'upload-disclosures') buildUploadGrid();
  else if (page === 'my-disclosures')     loadDisclosures();
  else if (page === 'ai-risk')            loadAIRisk();
  else if (page === 'approval-status')    loadApprovalStatus();
  else if (page === 'notifications')      loadNotifications();
  else if (page === 'profile')            loadProfile();
  else if (page === 'auth-dashboard')     loadAuthorityData();
  else if (page === 'auth-pending')       loadPendingReviews('');
  else if (page === 'auth-institutions')  renderAuthInstitutions();
  else if (page === 'auth-analytics')     renderAuthAnalytics();
}

function doLogout() {
  institutionId = 0; institutionName = ''; currentRole = '';
  uploadedSections = []; allInstitutions = []; dashboardData = {};
  Object.values(chartInstances).forEach(c => { if (c) c.destroy(); });
  chartInstances = {};
  document.getElementById('app').style.display = 'none';
  showScreen('landing');
}

function enterApp(role) {
  currentRole = role;
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none'; s.classList.remove('active');
  });
  const app = document.getElementById('app');
  app.style.display = 'flex'; app.classList.add('active');
  document.getElementById('userAvatarTop').textContent = (institutionName || '?')[0].toUpperCase();
  document.getElementById('userNameTop').textContent = institutionName;

  if (role === 'institution') {
    document.getElementById('inst-sidebar').style.display = 'block';
    document.getElementById('auth-sidebar').style.display = 'none';
    document.getElementById('roleBadge').textContent = 'INSTITUTION';
    document.getElementById('roleBadge').className = 'role-badge';
    document.getElementById('sidebarInstName').textContent = institutionName;
    navTo('inst-dashboard');
  } else {
    document.getElementById('inst-sidebar').style.display = 'none';
    document.getElementById('auth-sidebar').style.display = 'block';
    document.getElementById('roleBadge').textContent = 'AUTHORITY';
    document.getElementById('roleBadge').className = 'role-badge authority';
    document.getElementById('authSidebarName').textContent = institutionName;
    navTo('auth-dashboard');
  }
}
