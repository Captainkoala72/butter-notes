(() => {
  'use strict';
  const key = 'butter.theme.v1';
  const root = document.documentElement;
  let dark = false;
  try { dark = localStorage.getItem(key) === 'dark'; } catch { /* Still usable without storage. */ }
  const apply = () => {
    root.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#24231f' : '#f8d96b';
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
  };
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('theme-toggle').addEventListener('click', () => {
      dark = !dark; apply();
      try { localStorage.setItem(key, dark ? 'dark' : 'light'); } catch { /* Keep the session preference. */ }
    });
  });
  window.addEventListener('storage', event => {
    if (event.key === key) { dark = event.newValue === 'dark'; apply(); }
  });
})();
