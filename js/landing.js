(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initCursor() {
    if (reduceMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;

    const dot = document.createElement('span');
    const ring = document.createElement('span');
    dot.className = 'zera-cursor-dot';
    ring.className = 'zera-cursor-ring';
    document.body.append(dot, ring);
    document.documentElement.classList.add('has-zera-cursor');

    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;
    let frame;
    let lastSpark = 0;

    const render = () => {
      ringX += (targetX - ringX) * 0.16;
      ringY += (targetY - ringY) * 0.16;
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      frame = requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      document.body.classList.add('zera-cursor-visible');
      if (event.timeStamp - lastSpark > 42) {
        lastSpark = event.timeStamp;
        const spark = document.createElement('span');
        spark.className = 'zera-cursor-spark';
        spark.style.left = `${event.clientX}px`;
        spark.style.top = `${event.clientY}px`;
        document.body.appendChild(spark);
        spark.addEventListener('animationend', () => spark.remove(), { once: true });
      }
    }, { passive: true });
    document.addEventListener('pointerover', (event) => {
      document.body.classList.toggle('zera-cursor-action', Boolean(event.target.closest('a, button, input, select, textarea')));
    });
    document.addEventListener('pointerleave', () => document.body.classList.remove('zera-cursor-visible'));
    window.addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
    frame = requestAnimationFrame(render);
  }

  function initReveal() {
    if (reduceMotion.matches || !('IntersectionObserver' in window)) return;
    const items = document.querySelectorAll('.zera-manifesto-grid, .zera-values article, .zera-showcase-copy, .zera-path-panel, .zera-tool, .zera-final .container');
    items.forEach((item) => item.classList.add('zera-reveal'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((item) => observer.observe(item));
  }

  function initTilt() {
    if (reduceMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.zera-tool').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(700px) rotateX(${-y * 2.5}deg) rotateY(${x * 2.5}deg) translateY(-6px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  function initMagneticActions() {
    if (reduceMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.zera-cta, .zera-cta-small').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const bounds = button.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        button.style.transform = `translate(${x * 6}px, ${y * 5}px)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  }

  function initAtmosphere() {
    const hero = document.querySelector('.zera-hero');
    const art = document.querySelector('.zera-hero-art');
    const progress = document.createElement('div');
    progress.className = 'zera-scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    const updateProgress = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const value = distance > 0 ? Math.min(window.scrollY / distance, 1) : 0;
      progress.style.transform = `scaleX(${value})`;
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });

    if (reduceMotion.matches || !hero || !art || !window.matchMedia('(pointer: fine)').matches) return;
    hero.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 100;
      const y = ((event.clientY - bounds.top) / bounds.height) * 100;
      hero.style.setProperty('--spot-x', `${x}%`);
      hero.style.setProperty('--spot-y', `${y}%`);
      art.style.setProperty('--art-x', `${(x - 50) * 0.055}px`);
      art.style.setProperty('--art-y', `${(y - 50) * 0.055}px`);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      hero.style.removeProperty('--spot-x');
      hero.style.removeProperty('--spot-y');
      art.style.setProperty('--art-x', '0px');
      art.style.setProperty('--art-y', '0px');
    });
  }

  function start() {
    if (!document.body.classList.contains('zera-home')) return;
    initCursor();
    initReveal();
    initTilt();
    initMagneticActions();
    initAtmosphere();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}());
