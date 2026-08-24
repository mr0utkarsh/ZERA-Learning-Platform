(function () {
  'use strict';

  /*
   * =========================================================
   * ZERA APP.JS
   * Main frontend interactions
   * =========================================================
   */

  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn, {
        once: true
      });
    }
  }

  /*
   * =========================================================
   * HEADER SCROLL EFFECT
   * =========================================================
   */

  function initHeader() {
    const header = document.querySelector('.site-header');

    if (!header) return;

    function updateHeader() {
      header.classList.toggle(
        'is-scrolled',
        window.scrollY > 10
      );
    }

    updateHeader();

    window.addEventListener(
      'scroll',
      updateHeader,
      { passive: true }
    );
  }

  /*
   * =========================================================
   * MOBILE NAVIGATION
   * =========================================================
   */

  function initMobileNav() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.mobile-nav');

    if (!toggle || !nav) return;

    function closeMenu() {
      nav.classList.remove('open');
      toggle.setAttribute(
        'aria-expanded',
        'false'
      );
    }

    function toggleMenu() {
      const isOpen =
        nav.classList.contains('open');

      if (isOpen) {
        closeMenu();
      } else {
        nav.classList.add('open');

        toggle.setAttribute(
          'aria-expanded',
          'true'
        );
      }
    }

    toggle.addEventListener(
      'click',
      toggleMenu
    );

    /*
     * Close menu when a mobile link is clicked
     */

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener(
        'click',
        closeMenu
      );
    });

    /*
     * Close menu using Escape key
     */

    document.addEventListener(
      'keydown',
      function (event) {
        if (event.key === 'Escape') {
          closeMenu();
        }
      }
    );

    /*
     * Close mobile menu when resizing
     */

    window.addEventListener(
      'resize',
      function () {
        if (window.innerWidth > 980) {
          closeMenu();
        }
      }
    );
  }

  /*
   * =========================================================
   * PROGRESS BARS
   * =========================================================
   *
   * Usage:
   *
   * <div data-progress="75">
   *   <span></span>
   * </div>
   */

  function initProgressBars() {
    const progressElements =
      document.querySelectorAll(
        '[data-progress]'
      );

    progressElements.forEach(function (element) {
      let value = Number(
        element.dataset.progress
      );

      if (!Number.isFinite(value)) {
        value = 0;
      }

      value = Math.max(
        0,
        Math.min(100, value)
      );

      const bar =
        element.querySelector('span');

      if (!bar) return;

      bar.style.width = value + '%';

      bar.setAttribute(
        'role',
        'progressbar'
      );

      bar.setAttribute(
        'aria-valuemin',
        '0'
      );

      bar.setAttribute(
        'aria-valuemax',
        '100'
      );

      bar.setAttribute(
        'aria-valuenow',
        String(value)
      );
    });
  }

  /*
   * =========================================================
   * DEMO MODE ACTIONS
   * =========================================================
   */

  function showDemoMessage(message) {
    const text =
      message ||
      'Demo Mode: this action would connect to a real AI provider in a backend-enabled version.';

    /*
     * Use a custom toast when available.
     */

    let toast =
      document.querySelector(
        '.zera-demo-toast'
      );

    if (!toast) {
      toast =
        document.createElement('div');

      toast.className =
        'zera-demo-toast';

      toast.setAttribute(
        'role',
        'status'
      );

      toast.setAttribute(
        'aria-live',
        'polite'
      );

      Object.assign(
        toast.style,
        {
          position: 'fixed',
          left: '50%',
          bottom: '24px',
          transform: 'translateX(-50%) translateY(20px)',
          zIndex: '9999',
          maxWidth: 'min(92vw, 520px)',
          padding: '13px 18px',
          borderRadius: '14px',
          background: '#0b1d2d',
          color: '#ffffff',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.25)',
          opacity: '0',
          pointerEvents: 'none',
          transition: 'opacity .25s ease, transform .25s ease',
          fontSize: '14px',
          fontWeight: '600',
          textAlign: 'center'
        }
      );

      document.body.appendChild(toast);
    }

    toast.textContent = text;

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform =
        'translateX(-50%) translateY(0)';
    });

    clearTimeout(
      toast._zeraTimer
    );

    toast._zeraTimer =
      setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform =
          'translateX(-50%) translateY(20px)';
      }, 3500);
  }

  function initDemoNotes() {
    const demoElements =
      document.querySelectorAll(
        '[data-demo-note]'
      );

    demoElements.forEach(function (element) {
      element.addEventListener(
        'click',
        function (event) {
          /*
           * Prevent default only for actual buttons/links
           * that are explicitly marked as demo actions.
           */

          if (
            element.tagName === 'A' &&
            element.getAttribute('href') === '#'
          ) {
            event.preventDefault();
          }

          const message =
            element.dataset.demoMessage ||
            'Demo Mode: this action would connect to a real AI provider in a backend-enabled version.';

          showDemoMessage(message);
        }
      );
    });
  }

  /*
   * =========================================================
   * ACTIVE NAVIGATION
   * =========================================================
   */

  function initActiveNavigation() {
    const currentPage =
      window.location.pathname
        .split('/')
        .pop() || 'index.html';

    const links =
      document.querySelectorAll(
        '.nav a[href], .mobile-nav a[href]'
      );

    links.forEach(function (link) {
      const href =
        link.getAttribute('href');

      if (!href) return;

      /*
       * Ignore external links and anchors.
       */

      if (
        href.startsWith('http') ||
        href.startsWith('#') ||
        href.startsWith('tel:') ||
        href.startsWith('mailto:')
      ) {
        return;
      }

      const linkPage =
        href.split('/').pop() ||
        'index.html';

      if (linkPage === currentPage) {
        link.classList.add('active');
      }
    });
  }

  /*
   * =========================================================
   * BUTTON LOADING STATE
   * =========================================================
   */

  function initButtonFeedback() {
    const buttons =
      document.querySelectorAll(
        '[data-loading]'
      );

    buttons.forEach(function (button) {
      button.addEventListener(
        'click',
        function () {
          if (
            button.disabled ||
            button.dataset.loadingActive === 'true'
          ) {
            return;
          }

          button.dataset.loadingActive =
            'true';

          button.dataset.originalText =
            button.innerHTML;

          button.innerHTML =
            '<span aria-hidden="true">⏳</span> Processing...';

          button.disabled = true;

          const duration =
            Number(
              button.dataset.loadingDuration
            ) || 1200;

          setTimeout(function () {
            button.innerHTML =
              button.dataset.originalText;

            button.disabled = false;

            button.dataset.loadingActive =
              'false';
          }, duration);
        }
      );
    });
  }

  /*
   * =========================================================
   * LOCAL STORAGE SAFETY CHECK
   * =========================================================
   */

  function initStorage() {
    if (
      typeof window.zeraStorage !==
      'object'
    ) {
      return;
    }

    try {
      window.zeraStorage.initDefaults();
    } catch (error) {
      console.warn(
        'ZERA Storage initialization failed:',
        error
      );
    }
  }

  /*
   * =========================================================
   * REDUCED MOTION
   * =========================================================
   */

  function initReducedMotion() {
    const storage =
      window.zeraStorage;

    if (!storage) return;

    const preferences =
      storage.get(
        storage.keys.preferences,
        {
          theme: 'light',
          reducedMotion: false
        }
      );

    if (
      preferences &&
      preferences.reducedMotion
    ) {
      document.documentElement.classList.add(
        'reduced-motion'
      );
    }
  }

  /*
   * =========================================================
   * GLOBAL INITIALIZATION
   * =========================================================
   */

  ready(function () {
    initStorage();

    initHeader();

    initMobileNav();

    initProgressBars();

    initDemoNotes();

    initActiveNavigation();

    initButtonFeedback();

    initReducedMotion();
  });

})();