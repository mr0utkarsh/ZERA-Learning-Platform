(function () {
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initMobileNav() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.mobile-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  function initProgressBars() {
    document.querySelectorAll('[data-progress]').forEach((el) => {
      const value = Number(el.dataset.progress || 0);
      const bar = el.querySelector('span');
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
    });
  }

  function initDemoNotes() {
    const notes = document.querySelectorAll('[data-demo-note]');
    notes.forEach((note) => {
      note.addEventListener('click', () => {
        alert('Demo Mode: this action would connect to a real AI provider in a backend-enabled version.');
      });
    });
  }

  ready(() => {
    initHeader();
    initMobileNav();
    initProgressBars();
    initDemoNotes();
  });
})();
