(function () {
  async function renderInterview() {
    const root = document.getElementById('mockInterviewApp');
    if (!root) return;
    const token = localStorage.getItem('zera_token');
    if (!token) { window.location.replace('./login.html'); return; }
    try {
      const response = await fetch('http://localhost:5000/api/ai/mock-interview', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ role: 'student', domain: 'learning and technology', difficulty: 'medium' }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to generate interview practice.');
      const questions = data.data.questions || [];
      root.innerHTML = `<div class="panel"><h3>${data.data.title || 'Mock interview questions'}</h3><p>Practice structured answers with reflection and feedback.</p>${questions.map((question, index) => `<article class="panel" style="margin-bottom:12px;"><strong>Question ${index + 1}</strong><p>${question.question || question}</p>${question.tip ? `<small>${question.tip}</small>` : ''}</article>`).join('')}</div>`;
    } catch (error) {
      root.innerHTML = `<div class="empty-state"><strong>Unable to load interview practice</strong><span>${error.message}</span></div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', renderInterview);
})();
