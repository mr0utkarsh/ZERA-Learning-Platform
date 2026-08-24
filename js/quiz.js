(function () {
  const base = 'http://localhost:5000/api/student';
  const request = async (path, options = {}) => {
    const response = await fetch(`${base}${path}`, { method: options.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('zera_token')}` }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');
    return data.data;
  };

  async function renderQuiz() {
    const root = document.getElementById('quizApp');
    if (!root) return;

    if (!localStorage.getItem('zera_token')) {
      window.location.replace('./login.html');
      return;
    }

    let quizzes;
    try { quizzes = await request('/quizzes'); } catch (error) { root.innerHTML = `<div class="empty-state"><strong>Unable to load quizzes</strong><span>${error.message}</span></div>`; return; }
    const quiz = quizzes[0];
    if (!quiz || !quiz.questions?.length) { root.innerHTML = '<div class="empty-state"><strong>No quiz available</strong><span>A published quiz will appear here when it is ready.</span></div>'; return; }

    let currentIndex = 0;
    let score = 0;
    let answers = [];

    function renderQuestion() {
      const item = quiz.questions[currentIndex];
      if (!item) return;

      root.innerHTML = `
        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px;">
            <strong>${quiz.title} · Question ${currentIndex + 1}/${quiz.questions.length}</strong>
            <span class="badge neutral">${((currentIndex + 1) / quiz.questions.length * 100).toFixed(0)}%</span>
          </div>
            <h3>${item.prompt}</h3>
          <div style="display:grid; gap:10px; margin-top:16px;">
            ${item.options.map((option) => `
              <label style="display:flex; align-items:center; gap:10px; padding:0.8rem 0.9rem; border:1px solid rgba(17,34,55,0.08); border-radius:12px; background:#f5f9ff; cursor:pointer;">
                <input type="radio" name="answer-${currentIndex}" value="${option}" />
                <span>${option}</span>
              </label>
            `).join('')}
          </div>
          <div style="margin-top:16px; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-ghost btn-small" type="button" data-action="prev">Previous</button>
            <button class="btn btn-primary btn-small" type="button" data-action="next">${currentIndex === quiz.questions.length - 1 ? 'Submit' : 'Next'}</button>
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
      nextBtn.addEventListener('click', async () => {
        const selected = root.querySelector(`input[name="answer-${currentIndex}"]:checked`);
        if (!selected) {
          alert('Please select an answer before continuing.');
          return;
        }

        answers[currentIndex] = selected.value;
        if (currentIndex === quiz.questions.length - 1) {
          score = await request(`/quizzes/${quiz.id}/attempts`, { method: 'POST', body: { answers: answers.reduce((result, answer, index) => { result[quiz.questions[index].id] = answer; return result; }, {}) } }).then((result) => result.score);

          root.innerHTML = `
            <div class="panel">
              <h3>Quiz complete</h3>
              <p>You scored <strong>${score}/${quiz.questions.length}</strong> (${((score / quiz.questions.length) * 100).toFixed(0)}%).</p>
              <div class="progress-bar" style="margin-top:12px; margin-bottom:12px;"><span style="width:${(score / quiz.questions.length) * 100}%"></span></div>
              <ul style="padding-left:16px; color:#405672;">
                ${quiz.questions.map((item, idx) => `<li><strong>Q${idx + 1}:</strong> ${answers[idx] ? 'Submitted' : 'Review'}${item.explanation ? ` — ${item.explanation}` : ''}</li>`).join('')}
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
