(function () {
  const API_BASE_URL = 'http://localhost:5000/api/student';

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('zera_token')}`
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Request failed.');
    }

    return data.data;
  }

  async function renderTest() {
    const root = document.getElementById('mockTestApp');
    if (!root) return;

    if (!localStorage.getItem('zera_token')) {
      window.location.replace('./login.html');
      return;
    }

    let tests;
    try {
      tests = await apiRequest('/mock-tests');
    } catch (error) { root.innerHTML = `<div class="empty-state"><strong>Unable to load mock tests</strong><span>${error.message}</span></div>`; return; }
    const test = tests[0];
    if (!test || !test.questions?.length) { root.innerHTML = '<div class="empty-state"><strong>No mock test available</strong><span>A published assessment will appear here when it is ready.</span></div>'; return; }
    const testQuestions = test.questions;

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
          <h3>${item.prompt}</h3>
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

      root.querySelector('[data-action="next"]').addEventListener('click', async () => {
        const selectedInput = root.querySelector('input[name="mock-answer"]:checked');
        if (!selectedInput) {
          alert('Please select an answer before moving on.');
          return;
        }
        responses[currentIndex] = selectedInput.value;

        if (currentIndex === testQuestions.length - 1) {
          const result = await apiRequest(`/mock-tests/${test.id}/attempts`, { method: 'POST', body: { answers: responses } });
          score = result.score;

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
