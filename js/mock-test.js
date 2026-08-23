(function () {
  const testQuestions = [
    { question: 'A study system that adapts to the learner\'s needs is called:', options: ['Rigid learning', 'Personalized learning', 'Passive learning', 'Random learning'], answer: 'Personalized learning' },
    { question: 'Which habit improves memory most effectively?', options: ['Only reading notes', 'Active recall', 'Ignoring mistakes', 'Skipping practice',], answer: 'Active recall' },
    { question: 'A good revision block should include:', options: ['No review', 'Self-checking and recap', 'Only highlighting text', 'Only copying notes'], answer: 'Self-checking and recap' }
  ];

  function renderTest() {
    const root = document.getElementById('mockTestApp');
    if (!root) return;

    let currentIndex = 0;
    let score = 0;
    const responses = [];

    function draw() {
      const item = testQuestions[currentIndex];
      root.innerHTML = `
        <div class="panel">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
            <strong>Question ${currentIndex + 1}/${testQuestions.length}</strong>
            <span class="badge neutral">${Math.round(((currentIndex + 1) / testQuestions.length) * 100)}%</span>
          </div>
          <h3>${item.question}</h3>
          <div style="display:grid; gap:10px; margin-top:16px;">
            ${item.options.map((opt) => `
              <label style="display:flex; align-items:center; gap:10px; padding:0.8rem 0.9rem; border:1px solid rgba(17,34,55,0.08); border-radius:12px; background:#f5f9ff; cursor:pointer;">
                <input type="radio" name="mock-answer" value="${opt}" ${responses[currentIndex] === opt ? 'checked' : ''} />
                <span>${opt}</span>
              </label>`).join('')}
          </div>
          <div style="margin-top:16px; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-ghost btn-small" type="button" data-action="prev">Previous</button>
            <button class="btn btn-primary btn-small" type="button" data-action="next">${currentIndex === testQuestions.length - 1 ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      `;

      const selected = root.querySelector('input[name="mock-answer"]:checked');
      if (selected) responses[currentIndex] = selected.value;

      root.querySelector('[data-action="prev"]').addEventListener('click', () => {
        if (currentIndex > 0) {
          const selectedInput = root.querySelector('input[name="mock-answer"]:checked');
          if (selectedInput) responses[currentIndex] = selectedInput.value;
          currentIndex -= 1;
          draw();
        }
      });

      root.querySelector('[data-action="next"]').addEventListener('click', () => {
        const selectedInput = root.querySelector('input[name="mock-answer"]:checked');
        if (!selectedInput) {
          alert('Please select an answer before moving on.');
          return;
        }
        responses[currentIndex] = selectedInput.value;

        if (currentIndex === testQuestions.length - 1) {
          score = testQuestions.reduce((acc, question, idx) => acc + (responses[idx] === question.answer ? 1 : 0), 0);
          const attempts = JSON.parse(localStorage.getItem('zera_mock_tests') || '[]');
          attempts.push({ score, total: testQuestions.length, date: new Date().toISOString() });
          localStorage.setItem('zera_mock_tests', JSON.stringify(attempts));

          root.innerHTML = `
            <div class="panel">
              <h3>Mock test complete</h3>
              <p>You scored <strong>${score}/${testQuestions.length}</strong> (${Math.round((score / testQuestions.length) * 100)}%).</p>
              <div class="progress-bar" style="margin-top:12px;"><span style="width:${(score / testQuestions.length) * 100}%"></span></div>
              <div style="margin-top:16px;">
                <a class="btn btn-primary btn-small" href="./mock-test.html">Retry</a>
                <a class="btn btn-ghost btn-small" href="./dashboard.html">Dashboard</a>
              </div>
            </div>
          `;
          return;
        }

        currentIndex += 1;
        draw();
      });
    }

    draw();
  }

  document.addEventListener('DOMContentLoaded', renderTest);
})();
