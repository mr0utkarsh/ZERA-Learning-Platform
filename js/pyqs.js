(function () {
  const base = 'http://localhost:5000/api/student';
  async function load(filters = {}) {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const response = await fetch(`${base}/pyqs?${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem('zera_token')}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load PYQs.');
    const root = document.getElementById('pyqList');
    root.innerHTML = data.data.length ? data.data.map((item) => `<article class="panel" style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;"><strong>${item.course.title}</strong><span class="badge neutral">${item.year}</span></div><h3 style="margin-top:10px;">${item.question}</h3>${item.options ? `<ul>${item.options.map((option) => `<li>${option}</li>`).join('')}</ul>` : ''}<details style="margin-top:10px;"><summary>Show answer</summary><p style="margin-top:8px;">${item.answer || 'Answer unavailable'}</p>${item.explanation ? `<small>${item.explanation}</small>` : ''}</details></article>`).join('') : '<div class="empty-state"><strong>No PYQs found</strong><span>Try a different year or search term.</span></div>';
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('zera_token')) { window.location.replace('./login.html'); return; }
    const form = document.getElementById('pyqFilters');
    const run = () => load(Object.fromEntries(new FormData(form).entries())).catch((error) => { document.getElementById('pyqList').innerHTML = `<div class="empty-state"><strong>Unable to load PYQs</strong><span>${error.message}</span></div>`; });
    form.addEventListener('submit', (event) => { event.preventDefault(); run(); });
    run();
  });
})();
