(() => {
  const api = async (path, options = {}) => {
    const response = await fetch(`http://localhost:5000/api/student${path}`, { method: options.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('zera_token')}` }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');
    return data.data;
  };
  document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('zera_token')) return location.replace('./login.html');
    const canvas = document.querySelector('#noteCanvas'); const context = canvas.getContext('2d'); const strokes = []; const root = document.querySelector('#handwrittenList'); const message = document.querySelector('#handwrittenMessage'); let active;
    const show = (text, type) => { message.textContent = text; message.className = `notice ${type}`; };
    const getPoint = event => { const bounds = canvas.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height }; };
    const draw = stroke => { context.strokeStyle = stroke.color; context.lineWidth = stroke.width; context.lineCap = 'round'; context.beginPath(); stroke.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); };
    canvas.onpointerdown = event => { canvas.setPointerCapture(event.pointerId); active = { points: [getPoint(event)], color: '#102a43', width: 3 }; };
    canvas.onpointermove = event => { if (!active) return; active.points.push(getPoint(event)); draw({ ...active, points: active.points.slice(-2) }); };
    canvas.onpointerup = () => { if (active) { strokes.push(active); active = null; } };
    const load = async () => { try { const notes = await api('/handwritten-notes'); root.innerHTML = notes.map(note => `<article class="panel"><strong>${note.title}</strong><br><small>Updated ${new Date(note.updatedAt).toLocaleString()}</small><br><button class="btn btn-ghost btn-small" data-delete="${note.id}">Delete</button></article>`).join('') || '<div class="empty-state"><strong>No handwritten notes yet</strong><span>Your saved drawings will appear here.</span></div>'; root.querySelectorAll('[data-delete]').forEach(button => { button.onclick = async () => { if (!confirm('Delete this handwritten note?')) return; try { await api(`/handwritten-notes/${button.dataset.delete}`, { method: 'DELETE' }); load(); } catch (error) { show(error.message, 'error'); } }; }); } catch (error) { show(error.message, 'error'); } };
    document.querySelector('#clearCanvas').onclick = () => { strokes.length = 0; context.clearRect(0, 0, canvas.width, canvas.height); };
    document.querySelector('#saveCanvas').onclick = async () => { if (!strokes.length) return show('Draw something before saving.', 'error'); try { await api('/handwritten-notes', { method: 'POST', body: { title: document.querySelector('#handwrittenTitle').value, drawing: strokes, preview: canvas.toDataURL('image/png') } }); show('Handwritten note saved.', 'success'); document.querySelector('#clearCanvas').click(); load(); } catch (error) { show(error.message, 'error'); } };
    load();
  });
})();
