(function () {
  const API_BASE_URL = 'http://localhost:5000/api/auth';

  function getState() {
    try {
      return JSON.parse(localStorage.getItem('zera_user') || '{}');
    } catch {
      return {};
    }
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

  async function redirectAfterStudentAuth() {
    const response = await fetch('http://localhost:5000/api/onboarding', {
      headers: { Authorization: `Bearer ${localStorage.getItem('zera_token')}` }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.message || 'Unable to load your learning setup.');
    window.location.href = data.data.isComplete ? './dashboard.html' : './onboarding.html';
  }

  function showMessage(el, text, type = 'info') {
    if (!el) return;
    el.textContent = text;
    el.className = 'notice ' + type;
  }

  async function apiRequest(path, payload, method = 'POST') {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('zera_token') ? { Authorization: `Bearer ${localStorage.getItem('zera_token')}` } : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    const data = await response.json().catch(() => ({ success: false, message: 'Request failed.' }));

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Authentication request failed.');
    }

    return data;
  }

  function bindForm(formId, mode) {
    const form = document.getElementById(formId);
    if (!form) return;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton && !submitButton.dataset.defaultText) {
      submitButton.dataset.defaultText = submitButton.textContent.trim();
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const messageEl = document.getElementById('authMessage');

      const missingRequiredFields = (() => {
        if (mode === 'signup') return !payload.name || !payload.email || !payload.password;
        if (mode === 'login' || mode === 'admin-login') return !payload.email || !payload.password;
        if (mode === 'forgot') return !payload.email;
        if (mode === 'reset') return !payload.password;
        return false;
      })();

      if (missingRequiredFields) {
        showMessage(messageEl, 'Please complete all required fields.', 'error');
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Please wait...';
      }

      try {
        if (mode === 'signup') {
          const trimmedName = String(payload.name || '').trim();
          if (trimmedName.length < 2) {
            throw new Error('Name must be at least 2 characters long.');
          }

          const result = await apiRequest('/signup', {
            name: trimmedName,
            email: String(payload.email).trim().toLowerCase(),
            password: String(payload.password)
          });

          const user = result.data.user;
          setUser({ ...user, isLoggedIn: true });
          setToken(result.data.token);
          showMessage(messageEl, 'Account created successfully. Let’s set up your learning path.', 'success');
          setTimeout(() => { redirectAfterStudentAuth().catch((error) => showMessage(messageEl, error.message, 'error')); }, 500);
          return;
        }

        if (mode === 'login') {
          const result = await apiRequest('/login', {
            email: String(payload.email).trim().toLowerCase(),
            password: String(payload.password)
          });

          const user = result.data.user;
          setUser({ ...user, isLoggedIn: true });
          setToken(result.data.token);
          showMessage(messageEl, 'Login successful. Checking your learning setup.', 'success');
          setTimeout(() => { redirectAfterStudentAuth().catch((error) => showMessage(messageEl, error.message, 'error')); }, 500);
          return;
        }

        if (mode === 'forgot') {
          const resp = await apiRequest('/request-otp', { email: String(payload.email).trim().toLowerCase() });
          showMessage(messageEl, resp.message || 'If that email is registered, reset instructions are being prepared. Check your configured email provider setup.', 'notice');
          return;
        }

        if (mode === 'reset') {
          const token = new URLSearchParams(window.location.search).get('token');
          if (!token) {
            throw new Error('Missing reset token. Use the reset link provided by email.');
          }

          await apiRequest('/reset-password', {
            token,
            password: String(payload.password)
          });

          showMessage(messageEl, 'Password reset successful. Redirecting to login.', 'success');
          setTimeout(() => { window.location.href = './login.html'; }, 500);
          return;
        }

        if (mode === 'admin-login') {
          const result = await apiRequest('/admin/login', {
            email: String(payload.email).trim().toLowerCase(),
            password: String(payload.password)
          });

          const user = result.data.user;
          setUser({ ...user, isLoggedIn: true });
          setToken(result.data.token);
          showMessage(messageEl, 'Admin login successful. Redirecting to the admin dashboard.', 'success');
          setTimeout(() => { window.location.href = './admin.html'; }, 500);
        }
      } catch (error) {
        showMessage(messageEl, error.message || 'Authentication failed.', 'error');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = submitButton.dataset.defaultText || submitButton.textContent;
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindForm('loginForm', 'login');
    bindForm('signupForm', 'signup');
    bindForm('forgotForm', 'forgot');
    bindForm('resetForm', 'reset');
    bindForm('adminLoginForm', 'admin-login');

    const otpForm = document.getElementById('otpVerifyForm');
    if (otpForm) {
      otpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('forgotEmail')?.value.trim().toLowerCase();
        const otp = document.getElementById('otpCode')?.value.trim();
        const message = document.getElementById('authMessage');
        try {
          const result = await apiRequest('/verify-otp', { email, otp });
          window.location.href = `./reset-password.html?token=${encodeURIComponent(result.data.resetToken)}`;
        } catch (error) {
          showMessage(message, error.message, 'error');
        }
      });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        clearSession();
        window.location.href = './login.html';
      });
    }

    const currentUser = getState();
    const hasToken = Boolean(localStorage.getItem('zera_token'));
    if (currentUser && currentUser.isLoggedIn && hasToken && window.location.pathname.endsWith('login.html')) {
      redirectAfterStudentAuth().catch(() => {
        // A stale or expired session must not trap the student in a login/onboarding redirect loop.
        clearSession();
      });
    }
  });
})();
