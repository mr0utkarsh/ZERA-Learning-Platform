(function () {
  const base = 'http://localhost:5000/api/student';
  async function load() {
    const root = document.getElementById('notificationsList');
    if (!localStorage.getItem('zera_token')) { window.location.replace('./login.html'); return; }
    try {
      const response = await fetch(`${base}/notifications`, { headers: { Authorization: `Bearer ${localStorage.getItem('zera_token')}` } });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');
      const items = data.data;
      root.innerHTML = items.length ? items.map((item) => `<div class="task-item"><span><strong>${item.title}</strong><small style="display:block;">${item.message}</small></span><button class="btn btn-ghost btn-small" type="button" data-read="${item.id}" ${item.isRead ? 'disabled' : ''}>${item.isRead ? 'Read' : 'Mark read'}</button></div>`).join('') : '<div class="empty-state"><strong>No notifications</strong><span>You are all caught up.</span></div>';
      root.querySelectorAll('[data-read]').forEach((button) => button.addEventListener('click', async () => { await fetch(`${base}/notifications/${button.dataset.read}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('zera_token')}` } }); load(); }));
    } catch (error) { root.innerHTML = `<div class="empty-state"><strong>Unable to load notifications</strong><span>${error.message}</span></div>`; }
  }
  document.addEventListener('DOMContentLoaded', load);
})();