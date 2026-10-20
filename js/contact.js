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
