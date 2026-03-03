/* ═══════════════════════════════════════════════════════
   js/auth.js — Login, Register, OTP Verification
   ═══════════════════════════════════════════════════════ */

// ── Send OTP ──────────────────────────────────────────
async function sendOTP() {
  const email = document.getElementById('regEmail').value.trim();
  const errEl = document.getElementById('regErr');
  errEl.style.display = 'none';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showErr(errEl, 'Please enter a valid email address first.');
    return;
  }

  const btn = document.getElementById('sendOtpBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner" style="border-top-color:var(--white)"></span> Sending...';

  try {
    const res = await fetch(`${API}/send-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (!res.ok) {
      showErr(errEl, data.error || 'Failed to send OTP');
      btn.disabled = false;
      btn.innerHTML = '📧 Send OTP';
      return;
    }

    regEmailForOTP = email;
    document.getElementById('otpSentMsg').style.display = 'block';
    btn.innerHTML = '✅ OTP Sent';
    startResendCountdown();

  } catch (e) {
    showErr(errEl, 'Server error: ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '📧 Send OTP';
  }
}

// ── Proceed to OTP Step ───────────────────────────────
function proceedToOTP() {
  const errEl = document.getElementById('regErr');
  errEl.style.display = 'none';

  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const cpass = document.getElementById('regCpass').value;

  if (!name)           { showErr(errEl, 'Institution name is required.'); return; }
  if (!email)          { showErr(errEl, 'Email is required.'); return; }
  if (!pass)           { showErr(errEl, 'Password is required.'); return; }
  if (pass !== cpass)  { showErr(errEl, 'Passwords do not match.'); return; }
  if (pass.length < 6) { showErr(errEl, 'Password must be at least 6 characters.'); return; }

  if (!regEmailForOTP) {
    showErr(errEl, 'Please send OTP to your email first before proceeding.');
    return;
  }
  if (regEmailForOTP !== email) {
    showErr(errEl, 'Email changed after OTP was sent. Please send OTP again.');
    document.getElementById('otpSentMsg').style.display = 'none';
    document.getElementById('sendOtpBtn').disabled = false;
    document.getElementById('sendOtpBtn').innerHTML = '📧 Send OTP';
    regEmailForOTP = '';
    return;
  }

  // Move to step 2
  document.getElementById('reg-step1').style.display = 'none';
  document.getElementById('reg-step2').style.display = 'block';
  document.getElementById('otpEmailDisplay').textContent = email;
  document.getElementById('step2-num').style.background = 'var(--saffron)';
  document.getElementById('step2-num').style.color = '#fff';
  document.getElementById('step2-label').style.color = 'var(--saffron)';
  document.getElementById('otp0').focus();
}

// ── OTP Box Input Handling ────────────────────────────
function otpInput(e, idx) {
  const val = e.target.value.replace(/[^0-9]/g, '');
  e.target.value = val;
  e.target.style.borderColor = val ? 'var(--saffron)' : 'var(--border)';
  if (val && idx < 5) document.getElementById(`otp${idx + 1}`).focus();
}

function otpKeyUp(e, idx) {
  if (e.key === 'Backspace' && !e.target.value && idx > 0) {
    const prev = document.getElementById(`otp${idx - 1}`);
    prev.value = '';
    prev.style.borderColor = 'var(--border)';
    prev.focus();
  }
  const allFilled = [...Array(6)].every((_, i) => document.getElementById(`otp${i}`).value);
  if (allFilled) document.getElementById('verifyRegBtn').style.background = 'var(--green-india)';
}

function getOTPValue() {
  return [...Array(6)].map((_, i) => document.getElementById(`otp${i}`).value).join('');
}

// ── Resend OTP Countdown ──────────────────────────────
function startResendCountdown() {
  let secs = 30;
  document.getElementById('resendCountdown').style.display = 'inline';
  document.getElementById('resendLink').style.display = 'none';
  document.getElementById('countdownSec').textContent = secs;

  clearInterval(regCountdownTimer);
  regCountdownTimer = setInterval(() => {
    secs--;
    document.getElementById('countdownSec').textContent = secs;
    if (secs <= 0) {
      clearInterval(regCountdownTimer);
      document.getElementById('resendCountdown').style.display = 'none';
      document.getElementById('resendLink').style.display = 'inline';
    }
  }, 1000);
}

async function resendOTP() {
  const email = document.getElementById('regEmail').value.trim();
  document.getElementById('resendLink').style.display = 'none';

  try {
    const res = await fetch(`${API}/send-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) {
      regEmailForOTP = email;
      showToast('📧 New OTP sent to ' + email, 'green');
      [...Array(6)].forEach((_, i) => {
        document.getElementById(`otp${i}`).value = '';
        document.getElementById(`otp${i}`).style.borderColor = 'var(--border)';
      });
      document.getElementById('otp0').focus();
      startResendCountdown();
    } else {
      showToast('❌ ' + (data.error || 'Failed to resend'), 'red');
      document.getElementById('resendLink').style.display = 'inline';
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'red');
    document.getElementById('resendLink').style.display = 'inline';
  }
}

function backToStep1() {
  document.getElementById('reg-step2').style.display = 'none';
  document.getElementById('reg-step1').style.display = 'block';
  document.getElementById('step2-num').style.background = 'var(--gray-300)';
  document.getElementById('step2-num').style.color = 'var(--gray-700)';
  document.getElementById('step2-label').style.color = 'var(--gray-500)';
}

// ── Verify OTP + Register ─────────────────────────────
async function verifyOTPAndRegister() {
  const otp = getOTPValue();
  const errEl = document.getElementById('otpErr');
  errEl.style.display = 'none';

  if (otp.length !== 6) {
    showErr(errEl, 'Please enter the complete 6-digit OTP.');
    return;
  }

  const btn = document.getElementById('verifyRegBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Verifying & Registering...';

  try {
    const res = await fetch(`${API}/verify-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:            document.getElementById('regEmail').value.trim(),
        otp,
        institution_name: document.getElementById('regName').value.trim(),
        aicte_id:         document.getElementById('regAicteId').value.trim(),
        inst_type:        document.getElementById('regType').value,
        category:         document.getElementById('regCategory').value,
        year_established: parseInt(document.getElementById('regYear').value) || 2000,
        affiliated_univ:  document.getElementById('regUniv').value.trim(),
        state:            document.getElementById('regState').value,
        district:         document.getElementById('regDistrict').value.trim(),
        pincode:          document.getElementById('regPincode').value.trim(),
        principal_name:   document.getElementById('regPrincipal').value.trim(),
        mobile:           document.getElementById('regMobile').value.trim(),
        password:         document.getElementById('regPass').value,
      })
    });

    const data = await res.json();

    if (!res.ok) {
      document.getElementById('otpBoxes').style.animation = 'shake 0.4s';
      setTimeout(() => document.getElementById('otpBoxes').style.animation = '', 400);
      showErr(errEl, data.error || 'Verification failed');
      btn.disabled = false;
      btn.innerHTML = '✅ VERIFY & COMPLETE REGISTRATION';
      return;
    }

    institutionId = data.institution_id;
    institutionName = data.institution_name;
    showToast('🎉 Registration successful! Welcome to AICTE Portal.', 'green');
    clearInterval(regCountdownTimer);
    enterApp('institution');

  } catch (e) {
    showErr(errEl, 'Server error: ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '✅ VERIFY & COMPLETE REGISTRATION';
  }
}

// ── Institution Login ─────────────────────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginErr');
  errEl.style.display = 'none';

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Logging in...';

  try {
    const res = await fetch(`${API}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) { showErr(errEl, data.error || 'Login failed'); return; }
    institutionId = data.institution_id;
    institutionName = data.institution_name;
    enterApp('institution');
  } catch (e) {
    showErr(errEl, 'Server error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'LOGIN →';
  }
}

// ── Authority Login ───────────────────────────────────
async function doAuthorityLogin() {
  const email = document.getElementById('authEmail').value.trim();
  const pass  = document.getElementById('authPass').value;
  const errEl = document.getElementById('authLoginErr');
  errEl.style.display = 'none';

  const btn = document.getElementById('authLoginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Logging in...';

  try {
    const res = await fetch(`${API}/authority/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) { showErr(errEl, data.error || 'Login failed'); return; }
    institutionName = data.name;
    enterApp('authority');
  } catch (e) {
    showErr(errEl, 'Server error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'LOGIN →';
  }
}
