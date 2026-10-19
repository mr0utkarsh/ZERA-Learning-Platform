(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('performanceApp');
    if (!localStorage.getItem('zera_token')) { window.location.replace('./login.html'); return; }
    try {
      const response = await fetch('http://localhost:5000/api/student/performance', { headers: { Authorization: `Bearer ${localStorage.getItem('zera_token')}` } });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load performance.');
      const performance = data.data;
      root.innerHTML = `<div class="metrics-row"><article class="metric-card"><span class="kicker">Average score</span><strong>${performance.averageScorePercentage}%</strong></article><article class="metric-card"><span class="kicker">Attempts</span><strong>${performance.attempts}</strong></article></div><div class="panel"><h3>Course progress</h3>${performance.courses.length ? performance.courses.map((course) => `<div class="topic-item"><span>${course.course.title}</span><span class="badge neutral">${course.completionPercentage}%</span></div>`).join('') : '<div class="empty-state"><strong>No performance data yet</strong><span>Complete a lesson or assessment to begin tracking progress.</span></div>'}</div>`;
    } catch (error) { root.innerHTML = `<div class="empty-state"><strong>Unable to load performance</strong><span>${error.message}</span></div>`; }
  });
})();