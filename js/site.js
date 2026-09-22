(() => {
  'use strict';
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* private mode */ } },
  };

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const themeToggle = $('.theme-toggle');
  const systemTheme = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  let theme = storage.get('theme') || systemTheme;
  const applyTheme = next => {
    theme = next;
    root.setAttribute('data-theme', theme);
    if (themeToggle) {
      themeToggle.textContent = theme === 'light' ? '☾' : '☀';
      themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      themeToggle.setAttribute('title', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
    storage.set('theme', theme);
  };
  applyTheme(theme);
  themeToggle && themeToggle.addEventListener('click', () => applyTheme(theme === 'light' ? 'dark' : 'light'));

  /* ---------- mobile menu ---------- */
  const menu = $('.menu-toggle');
  const nav = $('.main-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      menu.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      menu.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- current nav state ---------- */
  const pageName = (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');
  const navMap = {
    'sahara-desert-trek.html': 'services.html',
    'imperial-cities.html': 'services.html',
    'private-morocco-road-trip.html': 'services.html',
  };
  const current = navMap[pageName] || pageName;
  const currentLink = $(`.main-nav a[href="${current}"]`);
  if (currentLink) {
    currentLink.classList.add('active');
    currentLink.setAttribute('aria-current', 'page');
  }

  /* ---------- scrolled topbar ---------- */
  const bar = $('.topbar');
  const updateBar = () => bar?.classList.toggle('is-scrolled', window.scrollY > 30);
  updateBar();
  window.addEventListener('scroll', updateBar, { passive: true });

  /* ---------- scroll reveal ---------- */
  const nodes = $$('.reveal');
  if (!('IntersectionObserver' in window) || (matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    nodes.forEach(node => node.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .12 });
    nodes.forEach(node => observer.observe(node));
  }

  /* ---------- inquiry form → WhatsApp ---------- */
  const form = $('#inquiry-form');
  const wa = $('a[href*="wa.me"]');
  if (form && wa) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const hp = $('input[name="website"]', form);
      if (hp && hp.value) return;
      const data = new FormData(form);
      const lines = [
        'Hello Musti Targui Morocco tours, I would like to plan a trip.',
        '',
        ...[...data.entries()]
          .filter(([key]) => key.toLowerCase() !== 'website')
          .map(([key, value]) => `${key}: ${value}`),
      ];
      const url = new URL(wa.href);
      url.searchParams.set('text', lines.join('\n'));
      const status = $('.form-status', form);
      if (status) status.textContent = 'Opening WhatsApp with your inquiry…';
      window.open(url.toString(), '_blank', 'noopener');
    });
  }
})();