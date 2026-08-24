(function () {
  const base = 'http://localhost:5000/api/student';
  const request = async (path, options = {}) => { const response = await fetch(`${base}${path}`, { method: options.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('zera_token')}` }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) }); const data = await response.json().catch(() => ({})); if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.'); return data.data; };
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

  async function generatePlan() {
    const course = document.getElementById('planCourse')?.value || 'ZERA Foundations';
    const examDate = document.getElementById('planExamDate')?.value || '14 days';
    const hours = document.getElementById('planHours')?.value || '2';
    const weakTopic = document.getElementById('planWeakTopic')?.value || 'Revision loops';

    const generated = await fetch('http://localhost:5000/api/ai/study-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('zera_token')}` }, body: JSON.stringify({ course, targetDate: examDate, hours, weakTopic }) }).then((response) => response.json());
    if (!generated.success) throw new Error(generated.message || 'Unable to generate study plan.');
    const plan = generated.data;
    await request('/study-plans', { method: 'POST', body: { title: plan.title, description: plan.description, schedule: plan.schedule } });
    await loadPlans();
  }

  function renderPlan(plan) {
    const root = document.getElementById('studyPlanList');
    if (!root) return;

    if (!plan || !plan.length) {
      root.innerHTML = '<div class="empty-state"><strong>No study plan yet</strong><span>Create a plan to see daily tasks here.</span></div>';
      return;
    }

    const tasks = Array.isArray(plan) ? plan : [];
    root.innerHTML = tasks.flatMap((item) => (Array.isArray(item.schedule) ? item.schedule.map((task) => ({ ...task, planTitle: item.title })) : [])).map((task) => `
      <article class="panel">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap;">
          <strong>${task.planTitle || 'Study task'} · ${task.title}</strong>
          <span class="badge neutral">${task.time}</span>
        </div>
        <p style="margin-top:8px;">${task.detail}</p>
      </article>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadPlans();

    const form = document.getElementById('studyPlanForm');
    if (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        try { await generatePlan(); } catch (error) { alert(error.message); }
      });
    }
  });

  async function loadPlans() {
    const root = document.getElementById('studyPlanList');
    if (!localStorage.getItem('zera_token')) { window.location.replace('./login.html'); return; }
    try { renderPlan(await request('/study-plans')); } catch (error) { if (root) root.innerHTML = `<div class="empty-state"><strong>Unable to load study plans</strong><span>${error.message}</span></div>`; }
  }
})();
