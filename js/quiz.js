(function () {
  const quizData = [
    {
      question: 'Which of the following best describes a personalized learning system?',
      options: ['A fixed path for all learners', 'A system that adapts to the learner\'s gaps and pace', 'A single exam paper for all students', 'A library without feedback'],
      answer: 'A system that adapts to the learner\'s gaps and pace',
      explanation: 'Personalized learning adapts to the learner\'s progress, gaps, and pace rather than using one generic sequence.'
    },
    {
      question: 'Why is active recall useful?',
      options: ['It reduces all practice', 'It improves memory through retrieval practice', 'It removes the need for revision', 'It is only for memorization without understanding'],
      answer: 'It improves memory through retrieval practice',
      explanation: 'Active recall strengthens memory by retrieving information instead of passively rereading it.'
    },
    {
      question: 'What should you do when a topic is weak?',
      options: ['Ignore it until the exam', 'Break it into smaller concepts and revise regularly', 'Only watch videos', 'Avoid practice questions'],
      answer: 'Break it into smaller concepts and revise regularly',
      explanation: 'Weak topics improve best when they are broken down, practiced regularly, and revisited over time.'
    }
  ];

  function renderQuiz() {
    const root = document.getElementById('quizApp');
    if (!root) return;

    let currentIndex = 0;
    let score = 0;
    let answers = [];

    function renderQuestion() {
      const item = quizData[currentIndex];
      if (!item) return;

      root.innerHTML = `
        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px;">
            <strong>Question ${currentIndex + 1}/${quizData.length}</strong>
            <span class="badge neutral">${((currentIndex + 1) / quizData.length * 100).toFixed(0)}%</span>
          </div>
          <h3>${item.question}</h3>
          <div style="display:grid; gap:10px; margin-top:16px;">
            ${item.options.map((option, idx) => `
              <label style="display:flex; align-items:center; gap:10px; padding:0.8rem 0.9rem; border:1px solid rgba(17,34,55,0.08); border-radius:12px; background:#f5f9ff; cursor:pointer;">
                <input type="radio" name="answer-${currentIndex}" value="${option}" />
                <span>${option}</span>
              </label>
            `).join('')}
          </div>
          <div style="margin-top:16px; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-ghost btn-small" type="button" data-action="prev">Previous</button>
            <button class="btn btn-primary btn-small" type="button" data-action="next">${currentIndex === quizData.length - 1 ? 'Submit' : 'Next'}</button>
          </div>
        </div>
      `;

      const btnPrev = root.querySelector('[data-action="prev"]');
      if (btnPrev) btnPrev.disabled = currentIndex === 0;

      root.querySelectorAll('input[name^="answer-"]').forEach((input) => {
        const saved = answers[currentIndex];
        if (saved && input.value === saved) input.checked = true;
      });

      const nextBtn = root.querySelector('[data-action="next"]');
      nextBtn.addEventListener('click', () => {
        const selected = root.querySelector(`input[name="answer-${currentIndex}"]:checked`);
        if (!selected) {
          alert('Please select an answer before continuing.');
          return;
        }

        answers[currentIndex] = selected.value;
        if (currentIndex === quizData.length - 1) {
          for (let i = 0; i < quizData.length; i++) {
            if (answers[i] === quizData[i].answer) score += 1;
          }

          const attempts = JSON.parse(localStorage.getItem('zera_quiz_attempts') || '[]');
          attempts.push({ score, total: quizData.length, date: new Date().toISOString() });
          localStorage.setItem('zera_quiz_attempts', JSON.stringify(attempts));

          root.innerHTML = `
            <div class="panel">
              <h3>Quiz complete</h3>
              <p>You scored <strong>${score}/${quizData.length}</strong> (${((score / quizData.length) * 100).toFixed(0)}%).</p>
              <div class="progress-bar" style="margin-top:12px; margin-bottom:12px;"><span style="width:${(score / quizData.length) * 100}%"></span></div>
              <ul style="padding-left:16px; color:#405672;">
                ${quizData.map((item, idx) => `<li><strong>Q${idx + 1}:</strong> ${answers[idx] === item.answer ? 'Correct' : 'Review'} — ${item.explanation}</li>`).join('')}
              </ul>
              <div style="margin-top:16px; display:flex; gap:12px; flex-wrap:wrap;">
                <button class="btn btn-primary btn-small" type="button" data-action="retry">Retry</button>
                <a class="btn btn-ghost btn-small" href="./dashboard.html">Back to dashboard</a>
              </div>
            </div>
          `;

          root.querySelector('[data-action="retry"]').addEventListener('click', renderQuiz);
          return;
        }

        currentIndex += 1;
        renderQuestion();
      });

      const prevBtn = root.querySelector('[data-action="prev"]');
      prevBtn && prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex -= 1;
          renderQuestion();
        }
      });
    }

    renderQuestion();
  }

  document.addEventListener('DOMContentLoaded', renderQuiz);
})();
