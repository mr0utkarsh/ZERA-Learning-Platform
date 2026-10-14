(() => {
  const api = window.ZeraApi.student;

  const message = (text, type) => {
    const el = document.querySelector('#profileMessage');
    if (!el) return;
    el.textContent = text;
    el.className = `notice ${type}`;
  };

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value != null) el.textContent = value == null ? '' : String(value);
  };

  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.ZeraApi.isLoggedIn()) {
      location.replace('./login.html');
      return;
    }

    const form = document.querySelector('#profileForm');

    try {
      const profile = await api.profile();
      const user = (profile && profile.user) || {};

      setText('profileName', user.name);
      setText('profileEmail', user.email);
      setText('profileRole', user.role);
      setText('profileMemberSince', user.createdAt ? new Date(user.createdAt).toLocaleDateString() : null);

      if (form && profile) {
        ['phone', 'bio', 'city', 'institution', 'graduationYear'].forEach((key) => {
          const field = form.elements[key];
          if (field && profile[key] != null) field.value = profile[key];
        });
      }
    } catch (error) {
      message(error.message, 'error');
    }

    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;

      try {
        // PATCH, and only the fields the route actually accepts.
        await api.updateProfile({
          phone: values.phone,
          bio: values.bio,
          city: values.city,
          institution: values.institution,
          graduationYear: values.graduationYear
        });
        message('Profile saved. It will be loaded again on your next visit.', 'success');
      } catch (error) {
        message(error.message, 'error');
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
})();
