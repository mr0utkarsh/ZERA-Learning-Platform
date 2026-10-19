<<<<<<< HEAD
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#contactForm');
    const message = document.querySelector('#contactStatus');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const api = window.ZeraApi;

      if (!api.isLoggedIn()) {
        message.textContent = 'Please log in before sending a support request.';
        message.className = 'notice error';
        return;
      }

      const button = form.querySelector('button');
      button.disabled = true;

      try {
        const data = await api.support.create({
          category: form.category.value,
          subject: form.subject.value,
          message: form.message.value
        });

        form.reset();
        message.textContent = 'Your support request was saved. Reference: ' + data.id;
        message.className = 'notice success';
      } catch (error) {
        message.textContent = error.message;
        message.className = 'notice error';
      } finally {
        button.disabled = false;
      }
    });
  });
})();
=======
(function () {
  const API_BASE = 'http://localhost:5000/api';

  async function sendMessage(payload) {
    const token = localStorage.getItem('zera_token');

    const response = await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to send your message.');
    }

    return data;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const nameInput = document.getElementById('contactName');
    const emailInput = document.getElementById('contactEmail');
    const messageInput = document.getElementById('contactMessage');
    const sendButton = document.getElementById('sendContactMessage');
    const status = document.getElementById('contactStatus');

    if (!sendButton) return;

    sendButton.addEventListener('click', async function () {
      const name = nameInput?.value.trim() || '';
      const email = emailInput?.value.trim() || '';
      const message = messageInput?.value.trim() || '';

      if (!name || !email || !message) {
        status.textContent = 'Please fill in all fields.';
        status.style.color = '#dc2626';
        return;
      }

      sendButton.disabled = true;
      sendButton.textContent = 'Sending...';

      status.textContent = '';
      status.style.color = '';

      try {
        await sendMessage({
          name,
          email,
          message
        });

        status.textContent = 'Your message has been sent successfully.';
        status.style.color = '#15803d';

        nameInput.value = '';
        emailInput.value = '';
        messageInput.value = '';
      } catch (error) {
        status.textContent = error.message;
        status.style.color = '#dc2626';
      } finally {
        sendButton.disabled = false;
        sendButton.textContent = 'Send message';
      }
    });
  });
})();
>>>>>>> 4804780593c11e68ae22b39c559dc624c40d29a7
