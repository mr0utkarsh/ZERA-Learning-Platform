(function () {
  const base = 'http://localhost:5000/api';
  const token = () => localStorage.getItem('zera_token');
  async function request(path, options = {}) { const response = await fetch(`${base}${path}`, { method: options.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) }); const data = await response.json().catch(() => ({})); if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.'); return data.data; }

  function renderMessage(content, type) {
    const box = document.getElementById('chatBox');
    if (!box) return;
    const item = document.createElement('div');
    item.className = `chat-item ${type}`;
    item.textContent = content;
    box.appendChild(item);
    box.scrollTop = box.scrollHeight;
  }

  function bindQuestionChips() {
    document.querySelectorAll('.question-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('questionInput');
        if (input) {
          input.value = chip.textContent.trim();
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!token()) { window.location.replace('./login.html'); return; }
    document.querySelectorAll('.question-chip').forEach((chip) => chip.addEventListener('click', () => { const input = document.getElementById('questionInput'); if (input) input.value = chip.textContent.trim(); }));
    request('/ai/status').then((status) => { const node = document.getElementById('aiStatus'); if (node) node.textContent = status.message; }).catch((error) => { const node = document.getElementById('aiStatus'); if (node) node.textContent = error.message; });

    const sendBtn = document.getElementById('sendQuestion');
    const clearBtn = document.getElementById('clearChat');
    const input = document.getElementById('questionInput');
    const select = document.getElementById('responseStyle');

    if (sendBtn) {
      sendBtn.addEventListener('click', async function () {
        const prompt = (input?.value || '').trim();
        if (!prompt) {
          renderMessage('Please ask a question so ZERA can respond.', 'bot');
          return;
        }

        renderMessage(prompt, 'user');

        sendBtn.disabled = true;
        try { const result = await request('/ai/doubt-solver', { method: 'POST', body: { question: prompt, style: select?.value || 'simple' } }); renderMessage(result.answer, 'bot'); if (input) input.value = ''; } catch (error) { renderMessage(error.message, 'bot'); } finally { sendBtn.disabled = false; }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        const box = document.getElementById('chatBox');
        if (box) box.innerHTML = '<div class="chat-item bot">Your AI learning partner is ready. Ask a question.</div>';
      });
    }
  });
})();
