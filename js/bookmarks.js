(function () {
  const base = 'http://localhost:5000/api/student';
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('zera_token')}` },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');
    return data.data;
  };

  async function load() {
    const root = document.getElementById('bookmarksList');
    if (!localStorage.getItem('zera_token')) { window.location.replace('./login.html'); return; }
    try {
      const items = await request('/bookmarks');
      root.innerHTML = items.length ? items.map((item) => `<div class="topic-item"><span><strong>${item.title}</strong>${item.notes ? `<small style="display:block;">${item.notes}</small>` : ''}</span><button class="btn btn-ghost btn-small" type="button" data-delete="${item.id}">Remove</button></div>`).join('') : '<div class="empty-state"><strong>No bookmarks yet</strong><span>Save lessons and references here.</span></div>';
      root.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => { await request(`/bookmarks/${button.dataset.delete}`, { method: 'DELETE' }); load(); }));
    } catch (error) { root.innerHTML = `<div class="empty-state"><strong>Unable to load bookmarks</strong><span>${error.message}</span></div>`; }
  }

  document.addEventListener('DOMContentLoaded', load);
})();