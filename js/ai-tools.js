(function () {
  const responses = {
    simple: 'A strong way to approach this is to break the concept into a definition, key idea, and a small real-world example. Start with the core principle, then connect it to what you are studying before practicing a question.',
    detailed: 'This concept is best understood by identifying the underlying principle, the common misconceptions, and one or two examples. In a learning workflow, you should first understand the idea, then test it with practice problems so the concept becomes durable.',
    exam: 'For exam-style answers, define the concept clearly, mention its importance, provide a concise example, and briefly explain the key difference from similar ideas. This keeps the answer precise while showing understanding.',
    example: 'Example approach: define the term, state the rule, then show a short scenario. For instance, if the topic is data structures, explain how the idea works in a real case and then connect that to a question pattern.'
  };

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
    bindQuestionChips();

    const sendBtn = document.getElementById('sendQuestion');
    const clearBtn = document.getElementById('clearChat');
    const input = document.getElementById('questionInput');
    const select = document.getElementById('responseStyle');

    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        const prompt = (input?.value || '').trim();
        if (!prompt) {
          renderMessage('Please ask a question so ZERA can respond.', 'bot');
          return;
        }

        renderMessage(prompt, 'user');

        const mode = select?.value || 'simple';
        const answer = responses[mode] || responses.simple;
        setTimeout(() => renderMessage(`ZERA says: ${answer}`, 'bot'), 250);
        if (input) input.value = '';
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        const box = document.getElementById('chatBox');
        if (box) box.innerHTML = '<div class="chat-item bot">Your AI learning partner is ready. Ask a question and get a demo explanation.</div>';
      });
    }
  });
})();
