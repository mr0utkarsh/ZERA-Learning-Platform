(function () {
  const interviewQuestions = [
    'Tell me about a time you improved your study approach.',
    'How do you stay organized when preparing for multiple exams?',
    'What is one piece of feedback you have used to improve?',
    'Describe a goal you set and how you tracked your progress.'
  ];

  function renderInterview() {
    const root = document.getElementById('mockInterviewApp');
    if (!root) return;

    const list = interviewQuestions.map((question, index) => `
      <article class="panel" style="margin-bottom: 12px;">
        <strong>Question ${index + 1}</strong>
        <p>${question}</p>
      </article>
    `).join('');

    root.innerHTML = `
      <div class="panel">
        <h3>Mock interview questions</h3>
        <p>Practice speaking in structured answers with a STAR-based approach.</p>
        <div>${list}</div>
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', renderInterview);
})();
