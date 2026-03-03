/* ═══════════════════════════════════════════════════════
   forgot-password.js — Forgot Password Flow:
   Open modal → Send OTP → Verify OTP → Reset Password
════════════════════════════════════════════════════════ */

let forgotEmail       = '';
let forgotOtpVerified = false;
let forgotCountdownTimer = null;

// ── Open / Close Modal ────────────────────────────────
function openForgotModal() {
  // Reset all steps
  forgotEmail       = '';
  forgotOtpVerified = false;
  document.getElementById('forgot-step1').style.display = 'block';
  document.getElementById('forgot-step2').style.display = 'none';
  document.getElementById('forgot-step3').style.display = 'none';
  document.getElementById('forgotEmail').value       = '';
  document.getElementById('forgotErr1').style.display  = 'none';
  document.getElementById('forgotErr2').style.display  = 'none';
  document.getElementById('forgotErr3').style.display  = 'none';
  document.getElementById('forgotOtpSentMsg').style.display = 'none';
  document.getElementById('forgotSendOtpBtn').disabled  = false;
  document.getElementById('forgotSendOtpBtn').innerHTML = '📧 Send OTP';
  document.getElementById('forgotModalTitle').textContent = '🔑 Forgot Password — Step 1 of 3';
  clearForgotOtpBoxes();
  document.getElementById('forgotModal').classList.add('open');
}

function closeForgotModal() {
  clearInterval(forgotCountdownTimer);
  document.getElementById('forgotModal').classList.remove('open');
}

// ── Step 1: Send OTP ──────────────────────────────────
async function forgotSendOTP() {
  const email = document.getElementById('forgotEmail').value.trim();
  const errEl = document.getElementById('forgotErr1');
  errEl.style.display = 'none';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showErr(errEl, 'Please enter a valid email address.');
    return;
  }

  const btn = document.getElementById('forgotSendOtpBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner" style="border-top-color:var(--white)"></span> Sending...';

  try {
    const res  = await fetch(`${API}/send-otp2/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (!res.ok) {
      showErr(errEl, data.error || 'Failed to send OTP. Check email is registered.');
      btn.disabled = false;
      btn.innerHTML = '📧 Send OTP';
      return;
    }

    forgotEmail = email;
    document.getElementById('forgotOtpSentMsg').style.display = 'block';
    btn.innerHTML = '✅ OTP Sent';
    forgotStartCountdown();

  } catch (e) {
    showErr(errEl, 'Server error: ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '📧 Send OTP';
  }
}

function forgotProceedToVerify() {
  const errEl = document.getElementById('forgotErr1');
  errEl.style.display = 'none';

  if (!forgotEmail) {
    showErr(errEl, 'Please send OTP to your email first.');
    return;
  }
  const currentEmail = document.getElementById('forgotEmail').value.trim();
  if (forgotEmail !== currentEmail) {
    showErr(errEl, 'Email changed. Please send OTP again.');
    forgotEmail = '';
    document.getElementById('forgotOtpSentMsg').style.display = 'none';
    document.getElementById('forgotSendOtpBtn').disabled = false;
    document.getElementById('forgotSendOtpBtn').innerHTML = '📧 Send OTP';
    return;
  }

  document.getElementById('forgot-step1').style.display = 'none';
  document.getElementById('forgot-step2').style.display = 'block';
  document.getElementById('forgotEmailDisplay').textContent = forgotEmail;
  document.getElementById('forgotModalTitle').textContent   = '🔑 Forgot Password — Step 2 of 3';
  document.getElementById('fotp0').focus();
}

// ── Step 2: OTP box helpers ───────────────────────────
function forgotOtpInput(e, idx) {
  const val = e.target.value.replace(/[^0-9]/g, '');
  e.target.value = val;
  e.target.style.borderColor = val ? 'var(--saffron)' : 'var(--border)';
  if (val && idx < 5) document.getElementById(`fotp${idx + 1}`).focus();
}

function forgotOtpKeyUp(e, idx) {
  if (e.key === 'Backspace' && !e.target.value && idx > 0) {
    const prev = document.getElementById(`fotp${idx - 1}`);
    prev.value = '';
    prev.style.borderColor = 'var(--border)';
    prev.focus();
  }
}

function getForgotOTPValue() {
  return [...Array(6)].map((_, i) => document.getElementById(`fotp${i}`).value).join('');
}

function clearForgotOtpBoxes() {
  [...Array(6)].forEach((_, i) => {
    const el = document.getElementById(`fotp${i}`);
    if (el) { el.value = ''; el.style.borderColor = 'var(--border)'; }
  });
}

// ── Step 2: Verify OTP ────────────────────────────────
async function forgotVerifyOTP() {
  const otp   = getForgotOTPValue();
  const errEl = document.getElementById('forgotErr2');
  errEl.style.display = 'none';

  if (otp.length !== 6) {
    showErr(errEl, 'Please enter the complete 6-digit OTP.');
    return;
  }

  try {
    const res  = await fetch(`${API}/verify-otp-only/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail, otp })
    });
    const data = await res.json();

    if (!res.ok) {
      // Shake OTP boxes
      const boxes = document.getElementById('forgotOtpBoxes');
      boxes.style.animation = 'shake 0.4s';
      setTimeout(() => boxes.style.animation = '', 400);
      showErr(errEl, data.error || 'Invalid OTP. Please try again.');
      return;
    }

    forgotOtpVerified = true;
    clearInterval(forgotCountdownTimer);
    document.getElementById('forgot-step2').style.display = 'none';
    document.getElementById('forgot-step3').style.display = 'block';
    document.getElementById('forgotModalTitle').textContent = '🔑 Forgot Password — Step 3 of 3';
    document.getElementById('forgotNewPass').focus();

  } catch (e) {
    showErr(errEl, 'Server error: ' + e.message);
  }
}

// ── Step 2: Resend OTP countdown ─────────────────────
function forgotStartCountdown() {
  let secs = 30;
  document.getElementById('forgotResendCountdown').style.display = 'inline';
  document.getElementById('forgotResendLink').style.display      = 'none';
  document.getElementById('forgotCountdownSec').textContent      = secs;

  clearInterval(forgotCountdownTimer);
  forgotCountdownTimer = setInterval(() => {
    secs--;
    document.getElementById('forgotCountdownSec').textContent = secs;
    if (secs <= 0) {
      clearInterval(forgotCountdownTimer);
      document.getElementById('forgotResendCountdown').style.display = 'none';
      document.getElementById('forgotResendLink').style.display      = 'inline';
    }
  }, 1000);
}

async function forgotResendOTP() {
  document.getElementById('forgotResendLink').style.display = 'none';
  try {
    const res  = await fetch(`${API}/send-otp2/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('📧 New OTP sent to ' + forgotEmail, 'green');
      clearForgotOtpBoxes();
      document.getElementById('fotp0').focus();
      forgotStartCountdown();
    } else {
      showToast('❌ ' + (data.error || 'Resend failed'), 'red');
      document.getElementById('forgotResendLink').style.display = 'inline';
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'red');
    document.getElementById('forgotResendLink').style.display = 'inline';
  }
}

function forgotBackToStep1() {
  clearInterval(forgotCountdownTimer);
  forgotEmail = '';
  document.getElementById('forgot-step2').style.display = 'none';
  document.getElementById('forgot-step1').style.display = 'block';
  document.getElementById('forgotOtpSentMsg').style.display = 'none';
  document.getElementById('forgotSendOtpBtn').disabled  = false;
  document.getElementById('forgotSendOtpBtn').innerHTML = '📧 Send OTP';
  document.getElementById('forgotModalTitle').textContent = '🔑 Forgot Password — Step 1 of 3';
}

// ── Step 3: Reset Password ────────────────────────────
async function forgotResetPassword() {
  const newPass  = document.getElementById('forgotNewPass').value;
  const confPass = document.getElementById('forgotConfirmPass').value;
  const errEl    = document.getElementById('forgotErr3');
  errEl.style.display = 'none';

  if (!newPass)              { showErr(errEl, 'Please enter a new password.'); return; }
  if (newPass.length < 6)    { showErr(errEl, 'Password must be at least 6 characters.'); return; }
  if (newPass !== confPass)  { showErr(errEl, 'Passwords do not match.'); return; }
  if (!forgotOtpVerified)    { showErr(errEl, 'OTP not verified. Please restart.'); return; }

  const btn = document.getElementById('forgotResetBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Resetting...';

  try {
    const res  = await fetch(`${API}/reset-password/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail, new_password: newPass })
    });
    const data = await res.json();

    if (!res.ok) {
      showErr(errEl, data.error || 'Password reset failed.');
      btn.disabled  = false;
      btn.innerHTML = '🔒 RESET PASSWORD';
      return;
    }

    showToast('✅ Password reset successfully! Please login.', 'green');
    closeForgotModal();
    showScreen('login');

  } catch (e) {
    showErr(errEl, 'Server error: ' + e.message);
    btn.disabled  = false;
    btn.innerHTML = '🔒 RESET PASSWORD';
  }
}