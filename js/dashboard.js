(() => {
  const base = 'http://localhost:5000/api';
  const request = async (path) => {
    const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${localStorage.getItem('zera_token')}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load dashboard data.');
    return payload.data;
  };
  const setText = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  const renderActivity = (summary) => {
    const root = document.getElementById('recentActivity'); if (!root) return;
    const entries = [...(summary.quizAttempts || []).map(item => ({ title: item.quiz?.title || 'Quiz', detail: `Score ${item.score}/${item.totalQuestions}` })), ...(summary.mockAttempts || []).map(item => ({ title: item.mockTest?.title || 'Mock test', detail: `Score ${item.score}/${item.totalQuestions}` }))].slice(0, 5);
    root.innerHTML = entries.length ? entries.map(entry => `<div class="task-item"><strong>${entry.title}</strong><span>${entry.detail}</span></div>`).join('') : '<div class="empty-state"><strong>No assessments recorded yet</strong><span>Take a quiz or mock test to see your results here.</span></div>';
  };
  document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('zera_token')) return window.location.replace('./login.html');
    const status = document.getElementById('dashboardStatus');
    try {
      const onboarding = await request('/onboarding'); if (!onboarding.isComplete) return window.location.replace('./onboarding.html');
      const [profile, dashboard, insights, summary] = await Promise.all([request('/student/profile'), request('/dashboard'), request('/student/dashboard-insights'), request('/student/assessment-summary')]);
      const overall = dashboard.overallProgress || 0;
      setText('userName', profile.user.name || 'Student'); setText('overallProgressValue', `${overall}%`); setText('courseProgressValue', `${overall}%`); setText('streakValue', String(insights.streakDays || 0)); setText('achievementValue', String(insights.achievementCount || 0));
      const bar = document.getElementById('mainProgressBar'); if (bar) bar.style.width = `${overall}%`;
      const nextLesson = dashboard.continueLearning?.nextLesson; setText('continueTitle', nextLesson ? 'Continue learning' : 'Next step'); setText('continueTopic', nextLesson?.title || (dashboard.totalCourses ? 'All enrolled lessons are complete.' : 'Choose a course to begin.'));
      renderActivity(summary);
    } catch (error) { if (status) { status.hidden = false; status.textContent = error.message; status.className = 'notice error'; } }
  });
})();
