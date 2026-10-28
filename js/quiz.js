(() => {
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const request = async (path, options = {}) => {
    const response = await fetch(`http://localhost:5000/api/student${path}`, { method: options.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('zera_token')}` }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.message || 'Quiz request failed.');
    return payload.data;
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const root = document.querySelector('#quizApp');
    if (!localStorage.getItem('zera_token')) return location.replace('./login.html');
    let quizzes;
    try { quizzes = await request('/quizzes'); } catch (error) { root.innerHTML = `<div class="empty-state"><strong>Unable to load quizzes</strong><span>${escapeHtml(error.message)}</span></div>`; return; }
    if (!quizzes.length) { root.innerHTML = '<div class="empty-state"><strong>No quizzes available yet</strong><span>Check back when a quiz has been added to your course.</span></div>'; return; }
    let quiz = quizzes[0]; let index = 0; const answers = {};
    const render = () => {
      const question = quiz.questions[index];
      root.innerHTML = `<div class="panel"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><span class="badge neutral">${escapeHtml(quiz.title)}</span><strong style="display:block;margin-top:10px">Question ${index + 1}/${quiz.questions.length}</strong></div><span class="badge neutral">${Math.round((index + 1) / quiz.questions.length * 100)}%</span></div><h3 style="margin-top:16px">${escapeHtml(question.prompt)}</h3><div style="display:grid;gap:10px;margin-top:16px">${question.options.map(option => `<label style="display:flex;gap:10px;padding:.8rem .9rem;border:1px solid rgba(17,34,55,.08);border-radius:12px;background:#f5f9ff;cursor:pointer"><input type="radio" name="answer" value="${escapeHtml(option)}" ${answers[question.id] === option ? 'checked' : ''}><span>${escapeHtml(option)}</span></label>`).join('')}</div><div style="margin-top:16px;display:flex;justify-content:space-between;gap:12px"><button class="btn btn-ghost btn-small" id="previous" ${index === 0 ? 'disabled' : ''}>Previous</button><button class="btn btn-primary btn-small" id="next">${index === quiz.questions.length - 1 ? 'Submit' : 'Next'}</button></div></div>`;
      document.querySelector('#previous').onclick = () => { index -= 1; render(); };
      document.querySelector('#next').onclick = async () => { const selected = root.querySelector('input[name="answer"]:checked'); if (!selected) return alert('Please select an answer before continuing.'); answers[question.id] = selected.value; if (index < quiz.questions.length - 1) { index += 1; return render(); } try { const result = await request(`/quizzes/${quiz.id}/attempts`, { method: 'POST', body: { answers } }); root.innerHTML = `<div class="panel"><h3>Quiz complete</h3><p>Your server-verified score is <strong>${result.score}/${result.totalQuestions}</strong> (${Math.round(result.score / result.totalQuestions * 100)}%).</p><div class="progress-bar" style="margin:12px 0"><span style="width:${result.score / result.totalQuestions * 100}%"></span></div><ul style="padding-left:16px">${result.results.map((item, itemIndex) => `<li><strong>Q${itemIndex + 1}:</strong> ${item.isCorrect ? 'Correct' : 'Review'}${item.explanation ? ` — ${escapeHtml(item.explanation)}` : ''}</li>`).join('')}</ul><div style="margin-top:16px"><button class="btn btn-primary btn-small" id="retry">Retry</button> <a class="btn btn-ghost btn-small" href="./dashboard.html">Back to dashboard</a></div></div>`; document.querySelector('#retry').onclick = () => { index = 0; Object.keys(answers).forEach(key => delete answers[key]); render(); }; } catch (error) { alert(error.message); } };
    };
    render();
  });
})();
