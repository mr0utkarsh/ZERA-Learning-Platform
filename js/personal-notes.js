(() => {
  const api = window.ZeraApi.student;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.ZeraApi.isLoggedIn()) {
      location.replace('./login.html');
      return;
    }

    const form = document.querySelector('#personalNotesForm');
    const root = document.querySelector('#personalNotesList');
    const message = document.querySelector('#noteMessage');
    const cancelEdit = document.querySelector('#cancelEdit');

    if (!form || !root) return;

    const show = (text, kind) => {
      if (!message) return;
      message.textContent = text;
      message.className = `notice ${kind}`;
    };

    const reset = () => {
      form.reset();
      form.noteId.value = '';
      if (cancelEdit) cancelEdit.hidden = true;
    };

    const load = async () => {
      try {
        const notes = await api.notes();

        // AI-generated notes are managed on the AI tools page, so they are kept
        // out of this personal list.
        const personal = notes.filter((n) => (n.tags || [])[0] !== 'AI-generated');

        root.innerHTML = personal.map((n) => `
          <article class="panel">
            <strong>${esc(n.title)}</strong>
            <p>${esc(n.content)}</p>
            <button class="btn btn-secondary btn-small" type="button" data-edit="${esc(n.id)}">Edit</button>
            <button class="btn btn-ghost btn-small" type="button" data-delete="${esc(n.id)}">Delete</button>
          </article>
        `).join('') || `
          <div class="empty-state">
            <strong>No personal notes yet</strong>
            <span>Create one to keep it in your account.</span>
          </div>
        `;

        root.querySelectorAll('[data-edit]').forEach((button) => {
          button.onclick = () => {
            const note = personal.find((x) => x.id === button.dataset.edit);
            if (!note) return;
            form.noteId.value = note.id;
            form.title.value = note.title;
            form.category.value = (note.tags || [])[0] || 'Personal';
            form.content.value = note.content;
            if (cancelEdit) cancelEdit.hidden = false;
          };
        });

        root.querySelectorAll('[data-delete]').forEach((button) => {
          button.onclick = async () => {
            if (!confirm('Delete this note?')) return;
            try {
              await api.deleteNote(button.dataset.delete);
              await load();
              show('Note deleted.', 'success');
            } catch (error) {
              show(error.message, 'error');
            }
          };
        });
      } catch (error) {
        show(error.message, 'error');
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = {
        title: form.title.value,
        category: form.category.value,
        content: form.content.value
      };
      const editingId = form.noteId.value;

      try {
        // The update route is PATCH, not PUT.
        if (editingId) {
          await api.updateNote(editingId, body);
        } else {
          await api.createNote(body);
        }
        reset();
        await load();
        show('Note saved.', 'success');
      } catch (error) {
        show(error.message, 'error');
      }
    });

    if (cancelEdit) cancelEdit.onclick = reset;

    load();
  });
})();
