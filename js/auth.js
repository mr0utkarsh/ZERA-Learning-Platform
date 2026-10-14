(function () {
  const api = window.ZeraApi;

  function getState() {
    return api.getUser();
  }

  function setUser(payload) {
    api.setUser(payload);
  }

  function setToken(token) {
    api.setToken(token);
  }

  function clearSession() {
    api.clearSession();
  }

  async function redirectAfterStudentAuth() {
    const data = await api.onboarding.get();
    window.location.href = data.isComplete ? './dashboard.html' : './onboarding.html';
  }

  function showMessage(el, text, type = 'info') {
    if (!el) return;
    el.textContent = text;
    el.className = 'notice ' + type;
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

          const result = await api.auth.signup({
            name: trimmedName,
            email: String(payload.email).trim().toLowerCase(),
            password: String(payload.password)
          });

          const user = result.data.user;
          setUser({ ...user, isLoggedIn: true });
          setToken(result.data.token);
          showMessage(messageEl, 'Account created successfully. Let us set up your learning path.', 'success');
          setTimeout(() => { redirectAfterStudentAuth().catch((error) => showMessage(messageEl, error.message, 'error')); }, 500);
          return;
        }

        if (mode === 'login') {
          const result = await api.auth.login({
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
          const resp = await api.auth.forgotPassword({ email: String(payload.email).trim().toLowerCase() });
          // Backend may return a config error if email not set; pass that message to UI
          showMessage(messageEl, resp.message || 'If that email is registered, reset instructions are being prepared. Check your configured email provider setup.', 'notice');
          return;
        }

        if (mode === 'reset') {
          const token = new URLSearchParams(window.location.search).get('token');
          if (!token) {
            throw new Error('Missing reset token. Use the reset link provided by email.');
          }

          await api.auth.resetPassword({
            token,
            password: String(payload.password)
          });

          showMessage(messageEl, 'Password reset successful. Redirecting to login.', 'success');
          setTimeout(() => { window.location.href = './login.html'; }, 500);
          return;
        }

        if (mode === 'admin-login') {
          const result = await api.auth.adminLogin({
            email: String(payload.email).trim().toLowerCase(),
            password: String(payload.password)
          });

          const user = result.data.user;
          setUser({ ...user, isLoggedIn: true });
          setToken(result.data.token);
          showMessage(messageEl, 'Admin login successful. Redirecting to the dashboard.', 'success');
          setTimeout(() => { window.location.href = './dashboard.html'; }, 500);
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

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        clearSession();
        window.location.href = './login.html';
      });
    }

    const currentUser = getState();
    const hasToken = api.isLoggedIn();
    if (currentUser && currentUser.isLoggedIn && hasToken && window.location.pathname.endsWith('login.html')) {
      redirectAfterStudentAuth().catch(() => {
        // A stale or expired session must not trap the student in a login/onboarding redirect loop.
        clearSession();
      });
    }
  });
})();
