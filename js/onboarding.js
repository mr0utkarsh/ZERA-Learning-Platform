(function () {
  const api = window.ZeraApi;

  const notice = (id, text, type = 'info') => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `notice ${type}`;
  };

  function busy(button, value, label) {
    button.disabled = value;
    button.textContent = value ? label : button.dataset.label;
  }

  /** Escapes a string for safe interpolation into the results markup. */
  const esc = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  async function init() {
    if (!api.isLoggedIn()) {
      window.location.replace('./login.html');
      return;
    }

    try {
      const state = await api.onboarding.get();
      if (state.isComplete) {
        window.location.replace('./dashboard.html');
        return;
      }

      const profile = state.profile || {};
      ['institution', 'city', 'learningGoal', 'studyLevel', 'weeklyHours'].forEach((key) => {
        const field = document.getElementById(key);
        if (field && profile[key] != null) field.value = profile[key];
      });

      if (profile.learningGoal && profile.studyLevel && profile.weeklyHours) {
        document.getElementById('syllabusStep').hidden = false;
      }
    } catch (error) {
      notice('profileMessage', error.message, 'error');
    }
  }

  function bindProfileForm() {
    const form = document.getElementById('profileSetupForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button');
      button.dataset.label ||= button.textContent;
      busy(button, true, 'Saving...');

      try {
        await api.onboarding.saveProfile(Object.fromEntries(new FormData(form).entries()));
        notice('profileMessage', 'Your learning setup has been saved.', 'success');
        const step = document.getElementById('syllabusStep');
        step.hidden = false;
        step.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        notice('profileMessage', error.message, 'error');
      } finally {
        busy(button, false);
      }
    });
  }

  function bindSyllabusForm() {
    const form = document.getElementById('syllabusUploadForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const input = document.getElementById('syllabusFile');
      const file = input.files && input.files[0];
      if (!file) {
        notice('syllabusMessage', 'Choose a file first.', 'error');
        return;
      }

      // The client enforces the same ceiling as the server so the user gets an
      // immediate answer, but the server limit is the one that actually counts.
      const maxBytes = Number(document.body.dataset.maxUploadBytes || 10 * 1024 * 1024);
      if (file.size > maxBytes) {
        notice('syllabusMessage', `Choose a file smaller than ${Math.floor(maxBytes / (1024 * 1024))} MB.`, 'error');
        return;
      }

      const button = form.querySelector('button');
      button.dataset.label ||= button.textContent;
      busy(button, true, 'Uploading...');

      try {
        // A real multipart body. The previous version sent JSON built from
        // `file.text()`, which silently truncated binary DOCX/PDF content and
        // was never accepted by the multipart-only upload route.
        const payload = new FormData();
        payload.append('file', file, file.name);

        const syllabus = await api.onboarding.uploadSyllabus(payload);

        const topics = (syllabus.analysis?.suggestedTopics || [])
          .map((topic) => `<li>${esc(topic)}</li>`)
          .join('');

        const result = document.getElementById('analysisResult');
        result.hidden = false;
        result.innerHTML =
          `<strong>${esc(syllabus.fileName)} saved</strong>` +
          `<p>${esc(syllabus.analysis?.note || '')}</p>` +
          `<ul>${topics || '<li>No headings detected; the text was still stored.</li>'}</ul>`;

        notice('syllabusMessage', 'Syllabus stored and analysed. Opening your dashboard...', 'success');
        setTimeout(() => window.location.replace('./dashboard.html'), 1200);
      } catch (error) {
        notice('syllabusMessage', error.message, 'error');
      } finally {
        busy(button, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    bindProfileForm();
    bindSyllabusForm();
  });
})();
