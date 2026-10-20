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

  function initPremiumUi() {
    if (document.body.classList.contains('zera-home')) return;
    document.body.classList.add('zera-app');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    if (!reducedMotion && finePointer) {
      const cursor = document.createElement('span');
      cursor.className = 'zera-app-cursor';
      document.body.appendChild(cursor);
      let cursorX = -100;
      let cursorY = -100;
      let targetX = -100;
      let targetY = -100;
      const paint = () => {
        cursorX += (targetX - cursorX) * 0.18;
        cursorY += (targetY - cursorY) * 0.18;
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
        requestAnimationFrame(paint);
      };
      window.addEventListener('pointermove', (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        cursor.classList.add('is-visible');
        cursor.classList.toggle('is-action', Boolean(event.target.closest('a, button, input, select, textarea')));
      }, { passive: true });
      paint();
    }

    if (!reducedMotion && 'IntersectionObserver' in window) {
      const revealItems = document.querySelectorAll('.panel, .component-card, .metric-card, .sidebar, .page-hero, .auth-card');
      revealItems.forEach((item, index) => {
        item.classList.add('zera-ui-reveal');
        item.style.setProperty('--reveal-delay', `${Math.min(index * 35, 240)}ms`);
      });
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      revealItems.forEach((item) => observer.observe(item));
    }
  }

  ready(() => {
    initHeader();
    initMobileNav();
    initProgressBars();
    initDemoNotes();
    initPremiumUi();
  });
})();
