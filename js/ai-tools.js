(function () {
  const api = window.ZeraApi;

  // Kept as a named local so the call sites below read the same as before; the
  // transport now lives entirely in js/api.js.
  async function apiRequest(path, body) {
    return api.request(path, { method: 'POST', body });
  }

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
        if (input) input.value = chip.textContent.trim();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!api.isLoggedIn()) {
      window.location.replace('./login.html');
      return;
    }

    bindQuestionChips();

    const sendBtn = document.getElementById('sendQuestion');
    const clearBtn = document.getElementById('clearChat');
    const input = document.getElementById('questionInput');
    const select = document.getElementById('responseStyle');

    if (sendBtn) {
      sendBtn.addEventListener('click', async function () {
        const question = (input?.value || '').trim();
        if (!question) {
          renderMessage('Please ask a question so ZERA can respond.', 'bot');
          return;
        }

        renderMessage(question, 'user');
        if (input) input.value = '';

        const style = select?.value || 'simple';
        sendBtn.disabled = true;

        // Show a typing indicator
        const typingId = 'typing-indicator';
        const box = document.getElementById('chatBox');
        const typing = document.createElement('div');
        typing.className = 'chat-item bot';
        typing.id = typingId;
        typing.textContent = 'ZERA is thinking…';
        box?.appendChild(typing);
        if (box) box.scrollTop = box.scrollHeight;

        try {
          const result = await apiRequest('/doubt-solver', { question, style });
          const answer = result?.answer || 'I could not generate a response. Please try again.';
          document.getElementById(typingId)?.remove();
          renderMessage(`ZERA: ${answer}`, 'bot');
        } catch (error) {
          document.getElementById(typingId)?.remove();
          // If AI not configured, show a friendly fallback
          if (error.message.includes('GEMINI_API_KEY') || error.message.includes('not configured')) {
            renderMessage('ZERA AI is not configured yet. Add GEMINI_API_KEY to the backend environment to enable live answers.', 'bot');
          } else {
            renderMessage(`Error: ${error.message}`, 'bot');
          }
        } finally {
          sendBtn.disabled = false;
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        const box = document.getElementById('chatBox');
        if (box) box.innerHTML = '<div class="chat-item bot">Your AI learning partner is ready. Ask a question to get started.</div>';
      });
    }
  });
})();
