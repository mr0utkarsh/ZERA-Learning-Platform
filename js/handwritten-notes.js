(() => {
  const api = async (path, options = {}) => {
    const response = await fetch(`http://localhost:5000/api/student${path}`, { method: options.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('zera_token')}` }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');
    return data.data;
  };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('zera_token')) return location.replace('./login.html');
    const canvas = document.querySelector('#noteCanvas'), context = canvas.getContext('2d'), strokes = [], root = document.querySelector('#handwrittenList'), message = document.querySelector('#handwrittenMessage'), title = document.querySelector('#handwrittenTitle');
    let activeStroke, editingId = null;
    const show = (text, type) => { message.textContent = text; message.className = `notice ${type}`; };
    const draw = stroke => { if (!stroke?.points?.length) return; context.strokeStyle = stroke.color; context.lineWidth = stroke.width; context.lineCap = 'round'; context.beginPath(); stroke.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); };
    const redraw = () => { context.clearRect(0, 0, canvas.width, canvas.height); strokes.forEach(draw); };
    const resetEditor = () => { editingId = null; strokes.length = 0; title.value = 'Untitled handwritten note'; redraw(); document.querySelector('#saveCanvas').textContent = 'Save note'; };
    const getPoint = event => { const bounds = canvas.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height }; };
    canvas.onpointerdown = event => { canvas.setPointerCapture(event.pointerId); activeStroke = { points: [getPoint(event)], color: '#102a43', width: 3 }; };
    canvas.onpointermove = event => { if (!activeStroke) return; activeStroke.points.push(getPoint(event)); draw({ ...activeStroke, points: activeStroke.points.slice(-2) }); };
    canvas.onpointerup = () => { if (activeStroke) { strokes.push(activeStroke); activeStroke = null; } };
    const open = async id => { try { const note = await api(`/handwritten-notes/${id}`); editingId = note.id; title.value = note.title; strokes.splice(0, strokes.length, ...(note.drawing || [])); redraw(); document.querySelector('#saveCanvas').textContent = 'Update note'; show('Editing saved handwritten note.', 'success'); window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (error) { show(error.message, 'error'); } };
    const load = async () => { try { const notes = await api('/handwritten-notes'); root.innerHTML = notes.map(note => `<article class="panel"><strong>${escapeHtml(note.title)}</strong><br><small>Updated ${new Date(note.updatedAt).toLocaleString()}</small><br><button class="btn btn-secondary btn-small" data-open="${note.id}">Open</button> <button class="btn btn-ghost btn-small" data-delete="${note.id}">Delete</button></article>`).join('') || '<div class="empty-state"><strong>No handwritten notes yet</strong><span>Your saved drawings will appear here.</span></div>';
      root.querySelectorAll('[data-open]').forEach(button => { button.onclick = () => open(button.dataset.open); });
      root.querySelectorAll('[data-delete]').forEach(button => { button.onclick = async () => { if (!confirm('Delete this handwritten note?')) return; try { await api(`/handwritten-notes/${button.dataset.delete}`, { method: 'DELETE' }); if (editingId === button.dataset.delete) resetEditor(); await load(); } catch (error) { show(error.message, 'error'); } }; });
    } catch (error) { show(error.message, 'error'); } };
    document.querySelector('#clearCanvas').onclick = () => { strokes.length = 0; redraw(); };
    document.querySelector('#saveCanvas').onclick = async () => { if (!strokes.length) return show('Draw something before saving.', 'error'); try { const payload = { title: title.value, drawing: strokes, preview: canvas.toDataURL('image/png') }; await api(editingId ? `/handwritten-notes/${editingId}` : '/handwritten-notes', { method: editingId ? 'PUT' : 'POST', body: payload }); show(editingId ? 'Handwritten note updated.' : 'Handwritten note saved.', 'success'); resetEditor(); await load(); } catch (error) { show(error.message, 'error'); } };
    load();
  });
})();
