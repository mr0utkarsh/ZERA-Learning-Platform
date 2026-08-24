(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('supportForm');
    const status = document.getElementById('supportStatus');
    if (!form) return;
    if (!localStorage.getItem('zera_token')) { window.location.replace('./login.html'); return; }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const response = await fetch('http://localhost:5000/api/student/support-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('zera_token')}` }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      const data = await response.json().catch(() => ({}));
      status.hidden = false;
      status.textContent = response.ok && data.success ? 'Your support request has been submitted.' : (data.message || 'Unable to submit your support request.');
      status.className = `notice ${response.ok && data.success ? 'success' : 'error'}`;
      if (response.ok && data.success) form.reset();
    });
  });
})();