(() => {
  const api = window.ZeraApi.student;

  const apply = (settings) => {
    if (!settings) return;
    document.documentElement.dataset.theme = String(settings.theme || 'LIGHT').toLowerCase();
    document.documentElement.classList.toggle('reduce-motion', Boolean(settings.motionReduced));
  };

  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.ZeraApi.isLoggedIn()) {
      location.replace('./login.html');
      return;
    }

    const form = document.querySelector('#settingsForm');
    const message = document.querySelector('#settingsMessage');

    const show = (text, kind) => {
      if (!message) return;
      message.textContent = text;
      message.className = `notice ${kind}`;
    };

    if (!form) {
      show('Settings form is missing on this page.', 'error');
      return;
    }

    try {
      const settings = await api.settings();
      // The API stores theme as an enum string; the select uses title case.
      form.theme.value = String(settings.theme || 'LIGHT').toLowerCase();
      form.motionReduced.checked = Boolean(settings.motionReduced);
      apply(settings);
    } catch (error) {
      show(error.message, 'error');
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;

      try {
        const saved = await api.saveSettings({
          theme: form.theme.value.toUpperCase(),
          motionReduced: form.motionReduced.checked
        });
        apply(saved);
        show('Settings saved.', 'success');
      } catch (error) {
        show(error.message, 'error');
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
})();
