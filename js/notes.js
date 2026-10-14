(function () {
  const request = (path, options = {}) => window.ZeraApi.request(path, { ...options, base: '/api/student' });
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function renderNotes() {
    const root = document.getElementById('notesList');
    if (!localStorage.getItem('zera_token')) { window.location.replace('./login.html'); return; }
    let notes; try { notes = await request('/notes'); } catch (error) { root.innerHTML = `<div class="empty-state"><strong>Unable to load notes</strong><span>${error.message}</span></div>`; return; }
    if (!root) return;

    if (!notes.length) {
      root.innerHTML = '<div class="empty-state"><strong>No notes yet</strong><span>Create a note or generate a demo summary to begin.</span></div>';
      return;
    }

    root.innerHTML = notes.map((note) => `
      <article class="panel">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:10px;">
          <strong>${note.title}</strong>
          <span class="badge neutral">${note.tags?.[0] || 'General'}</span>
        </div>
        <p>${note.content}</p>
      </article>
    `).join('');
  }

  function bindGenerator() {
    const form = document.getElementById('notesForm');
    if (!form) return;

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const formData = new FormData(form);
      const title = formData.get('title') || 'New AI note';
      const category = formData.get('category') || 'AI-generated';
      const content = formData.get('content') || 'Topic summary: review the main concept, key definitions, and examples.';

      try { await request('/notes', { method: 'POST', body: { title, category, content } }); await renderNotes(); form.reset(); } catch (error) { alert(error.message); }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderNotes();
    bindGenerator();
  });
})();
