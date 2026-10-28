(function () {
  const detectedBase = (() => {
    const host = (typeof location !== 'undefined' && location.hostname) || '';
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return 'http://localhost:5000';
    }
    return 'https://zera-backend-production.up.railway.app';
  })();
  const API_BASE = (window.ZERA_API_BASE && String(window.ZERA_API_BASE).replace(/\/$/, '')) || detectedBase;
  const AUTH_PATH = '/api/auth';

  function getState() {
    try { return JSON.parse(localStorage.getItem('zera_user') || '{}'); } catch { return {}; }
  }

  function setUser(payload) {
    localStorage.setItem('zera_user', JSON.stringify(payload));
  }

  function setToken(token) {
    localStorage.setItem('zera_token', token);
  }

  function clearSession() {
    localStorage.removeItem('zera_token');
    localStorage.setItem('zera_user', JSON.stringify({ isLoggedIn: false }));
  }

  function showMessage(el, text, type = 'info') {
    if (!el) return;
    el.textContent = text;
    el.className = 'notice notice--live ' + (type === 'success' ? 'notice--success' : type === 'error' ? 'notice--error' : 'notice--info');
  }

  function setFieldError(formId, fieldId, text) {
    const el = document.getElementById(fieldId + 'Error');
    const input = document.getElementById(fieldId);
    const field = input ? input.closest('.field') : null;
    if (el) {
      el.textContent = text || '';
      el.style.display = text ? 'block' : 'none';
      el.setAttribute('aria-hidden', text ? 'false' : 'true');
    }
    if (field) {
      if (text) { field.classList.add('field--error'); field.classList.remove('field--success'); }
      else { field.classList.remove('field--error'); }
    }
  }

  function clearAllErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('.error-text').forEach(el => { el.textContent = ''; el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); });
    form.querySelectorAll('.field--error').forEach(el => el.classList.remove('field--error'));
  }

  function setLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
      button.dataset.defaultText = button.dataset.defaultText || button.textContent.trim();
      button.textContent = '';
      button.classList.add('btn--loading');
      button.setAttribute('aria-busy', 'true');
    } else {
      button.classList.remove('btn--loading');
      button.textContent = button.dataset.defaultText || button.textContent;
      button.removeAttribute('aria-busy');
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
  }

  function passwordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z\d]/.test(password)) score += 1;
    return score;
  }

  function strengthLabel(score) {
    if (score <= 1) return 'Too weak';
    if (score === 2) return 'Weak';
    if (score === 3) return 'Fair';
    if (score === 4) return 'Good';
    return 'Strong';
  }

  function strengthColor(score) {
    if (score <= 1) return 'var(--danger)';
    if (score === 2) return '#f59e0b';
    if (score === 3) return '#eab308';
    if (score === 4) return 'var(--success)';
    return 'var(--success)';
  }

  function setupStrengthMeter(passwordId, meterId, barId, textId) {
    const input = document.getElementById(passwordId);
    const meter = document.getElementById(meterId);
    const bar = document.getElementById(barId);
    const text = document.getElementById(textId);
    if (!input || !meter || !bar || !text) return;
    input.addEventListener('input', function () {
      const value = input.value || '';
      const score = passwordStrength(value);
      const width = value.length ? Math.round((score / 5) * 100) : 0;
      bar.style.width = width + '%';
      bar.style.backgroundColor = strengthColor(score);
      meter.setAttribute('aria-valuenow', score);
      meter.setAttribute('aria-valuemax', '5');
      text.textContent = value.length ? strengthLabel(score) : '';
      text.style.color = value.length ? strengthColor(score) : '#6b7a8c';
    });
  }

  function setupPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (!toggle || !input) return;
    toggle.addEventListener('click', function () {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.setAttribute('aria-pressed', String(!showing));
      toggle.textContent = showing ? 'Show' : 'Hide';
    });
  }

  async function apiRequest(path, payload, method = 'POST') {
    const response = await fetch(`${API_BASE}${AUTH_PATH}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('zera_token') ? { Authorization: 'Bearer ' + localStorage.getItem('zera_token') } : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    let data;
    try { data = await response.json(); } catch { data = { success: false, message: 'Request failed.' }; }

    if (!response.ok || data.success === false) {
      const err = new Error(data.message || 'Authentication request failed.');
      err.statusCode = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  function redirectAfterStudentAuth(token) {
    return fetch(`${API_BASE}/api/onboarding`, {
      headers: { Authorization: 'Bearer ' + token }
    }).then(async function (response) {
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.success) throw new Error(data && data.message ? data.message : 'Unable to load your learning setup.');
      return data.data && data.data.isComplete ? './dashboard.html' : './onboarding.html';
    });
  }

  function bindOAuthButton(buttonId, provider, hintId) {
    const button = document.getElementById(buttonId);
    const hint = document.getElementById(hintId);
    if (!button) return;

    fetch(`${API_BASE}${AUTH_PATH}/oauth/${provider}`, { method: 'GET' })
      .then(async function (response) {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success || !data.authorizationUrl) {
          if (hint) { hint.style.display = 'block'; }
          button.disabled = true;
          button.setAttribute('aria-disabled', 'true');
          return;
        }
        button.dataset.authUrl = data.authorizationUrl;
        button.addEventListener('click', function () {
          window.location.href = button.dataset.authUrl;
        });
      })
      .catch(function () {
        if (hint) { hint.style.display = 'block'; }
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      });
  }

  function bindForm(formId, mode) {
    const form = document.getElementById(formId);
    if (!form) return;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton && !submitButton.dataset.defaultText) {
      submitButton.dataset.defaultText = submitButton.textContent.trim();
    }

    const messageEl = document.getElementById('authMessage');

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearAllErrors(formId);
      if (messageEl) messageEl.textContent = '';

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      if (mode === 'signup') {
        const name = String(payload.name || '').trim();
        const email = String(payload.email || '').trim().toLowerCase();
        const password = String(payload.password || '');
        const confirmPassword = String(payload.confirmPassword || '');

        if (!name || !email || !password || !confirmPassword) {
          showMessage(messageEl, 'Please complete all required fields.', 'error');
          return;
        }
        if (name.length < 2) { setFieldError(formId, 'signupName', 'Name must be at least 2 characters long.'); showMessage(messageEl, 'Please fix the highlighted field.', 'error'); return; }
        if (!isValidEmail(email)) { setFieldError(formId, 'signupEmail', 'Please provide a valid email address.'); showMessage(messageEl, 'Please fix the highlighted field.', 'error'); return; }
        if (password.length < 8) { setFieldError(formId, 'signupPassword', 'Password must be at least 8 characters.'); showMessage(messageEl, 'Please fix the highlighted field.', 'error'); return; }
        if (password !== confirmPassword) { setFieldError(formId, 'signupConfirmPassword', 'Passwords do not match.'); showMessage(messageEl, 'Please fix the highlighted field.', 'error'); return; }

        setLoading(submitButton, true);
        try {
          const result = await apiRequest('/signup', { name, email, password });
          const user = result.data && result.data.user;
          setUser({ ...user, isLoggedIn: true });
          setToken(result.data && result.data.token);
          showMessage(messageEl, 'Account created successfully. Setting up your learning path.', 'success');
          setTimeout(function () {
            redirectAfterStudentAuth(result.data && result.data.token).then(function (url) {
              window.location.href = url;
            }).catch(function (error) {
              showMessage(messageEl, error.message, 'error');
            });
          }, 400);
        } catch (error) {
          if (error.statusCode === 409) {
            setFieldError(formId, 'signupEmail', 'An account with this email already exists.');
            showMessage(messageEl, 'An account with this email already exists. Please sign in instead.', 'error');
          } else {
            showMessage(messageEl, error.message || 'Account creation failed.', 'error');
          }
        } finally {
          setLoading(submitButton, false);
        }
        return;
      }

      if (mode === 'login') {
        const email = String(payload.email || '').trim().toLowerCase();
        const password = String(payload.password || '');
        if (!email || !password) { showMessage(messageEl, 'Please complete all required fields.', 'error'); return; }
        if (!isValidEmail(email)) { setFieldError(formId, 'loginEmail', 'Please provide a valid email address.'); showMessage(messageEl, 'Please fix the highlighted field.', 'error'); return; }

        setLoading(submitButton, true);
        try {
          const result = await apiRequest('/login', { email, password });
          const user = result.data && result.data.user;
          setUser({ ...user, isLoggedIn: true });
          setToken(result.data && result.data.token);
          showMessage(messageEl, 'Login successful. Loading your learning setup.', 'success');
          setTimeout(function () {
            redirectAfterStudentAuth(result.data && result.data.token).then(function (url) {
              window.location.href = url;
            }).catch(function (error) {
              showMessage(messageEl, error.message, 'error');
            });
          }, 400);
        } catch (error) {
          showMessage(messageEl, error.message || 'Invalid email or password.', 'error');
        } finally {
          setLoading(submitButton, false);
        }
        return;
      }

      if (mode === 'forgot') {
        const email = String(payload.email || '').trim().toLowerCase();
        if (!email || !isValidEmail(email)) { setFieldError(formId, 'forgotEmail', 'Please provide a valid email address.'); showMessage(messageEl, 'Please fix the highlighted field.', 'error'); return; }

        setLoading(submitButton, true);
        try {
          const result = await apiRequest('/forgot-password', { email });
          showMessage(messageEl, result.message || 'If an account exists for this email, reset instructions have been sent.', 'success');
        } catch (error) {
          showMessage(messageEl, error.message || 'Unable to process your request. Please try again later.', 'error');
        } finally {
          setLoading(submitButton, false);
        }
        return;
      }

      if (mode === 'reset') {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const token = urlParams.get('token') || hashParams.get('token') || '';
        const password = String(payload.password || '');
        if (!token) { showMessage(messageEl, 'Missing reset token. Use the reset link provided by email.', 'error'); return; }
        if (password.length < 8) { setFieldError(formId, 'newPassword', 'Password must be at least 8 characters.'); showMessage(messageEl, 'Please fix the highlighted field.', 'error'); return; }

        setLoading(submitButton, true);
        try {
          await apiRequest('/reset-password', { token, password });
          showMessage(messageEl, 'Password reset successful. Redirecting to sign in.', 'success');
          setTimeout(function () { window.location.href = './login.html'; }, 600);
        } catch (error) {
          showMessage(messageEl, error.message || 'Password reset failed. The token may be invalid or expired.', 'error');
        } finally {
          setLoading(submitButton, false);
        }
        return;
      }

      if (mode === 'admin-login') {
        const email = String(payload.email || '').trim().toLowerCase();
        const password = String(payload.password || '');
        if (!email || !password) { showMessage(messageEl, 'Please complete all required fields.', 'error'); return; }

        setLoading(submitButton, true);
        try {
          const result = await apiRequest('/admin/login', { email, password });
          const user = result.data && result.data.user;
          setUser({ ...user, isLoggedIn: true });
          setToken(result.data && result.data.token);
          showMessage(messageEl, 'Admin login successful. Redirecting to the dashboard.', 'success');
          setTimeout(function () { window.location.href = './dashboard.html'; }, 500);
        } catch (error) {
          showMessage(messageEl, error.message || 'Invalid admin credentials.', 'error');
        } finally {
          setLoading(submitButton, false);
        }
        return;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindForm('loginForm', 'login');
    bindForm('signupForm', 'signup');
    bindForm('forgotForm', 'forgot');
    bindForm('resetForm', 'reset');
    bindForm('adminLoginForm', 'admin-login');

    setupPasswordToggle('toggleLoginPassword', 'loginPassword');
    setupPasswordToggle('toggleSignupPassword', 'signupPassword');
    setupPasswordToggle('toggleSignupConfirmPassword', 'signupConfirmPassword');
    setupPasswordToggle('toggleResetPassword', 'newPassword');

    setupStrengthMeter('signupPassword', 'signupStrengthMeter', 'signupStrengthBar', 'signupStrengthText');
    setupStrengthMeter('newPassword', 'resetStrengthMeter', 'resetStrengthBar', 'resetStrengthText');

    bindOAuthButton('oauthGoogle', 'google', 'oauthGoogleHint');
    bindOAuthButton('oauthGithub', 'github', 'oauthGithubHint');
    bindOAuthButton('oauthGoogleSignup', 'google', 'oauthGoogleSignupHint');
    bindOAuthButton('oauthGithubSignup', 'github', 'oauthGithubSignupHint');

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        clearSession();
        window.location.href = './login.html';
      });
    }

    const currentUser = getState();
    const hasToken = Boolean(localStorage.getItem('zera_token'));
    const isAuthPage = /(login|signup|forgot-password|reset-password|admin-login|auth-callback)\.html$/.test(window.location.pathname);
    if (currentUser && currentUser.isLoggedIn && hasToken && isAuthPage && !window.location.pathname.endsWith('auth-callback.html')) {
      fetch(`${API_BASE}/api/onboarding`, { headers: { Authorization: 'Bearer ' + localStorage.getItem('zera_token') } })
        .then(async function (response) {
          const data = await response.json().catch(() => null);
          if (!response.ok || !data || !data.success) { clearSession(); return; }
          window.location.href = (data.data && data.data.isComplete) ? './dashboard.html' : './onboarding.html';
        })
        .catch(function () { clearSession(); });
    }
  });
})();
