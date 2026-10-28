(() => {
  'use strict';
  const key = 'butter.zoom.v1';
  let zoom = 100;
  try {
    const stored = Number(localStorage.getItem(key));
    if (Number.isFinite(stored) && stored >= 80 && stored <= 160) zoom = stored;
  } catch { /* Zoom still works when browser storage is unavailable. */ }
  const out = document.getElementById('zoom-out');
  const reset = document.getElementById('zoom-reset');
  const into = document.getElementById('zoom-in');
  function apply(announce = false) {
    document.querySelector('.notepad').style.setProperty('--notepad-zoom', zoom / 100);
    reset.textContent = zoom + '%';
    out.disabled = zoom <= 80;
    into.disabled = zoom >= 160;
    if (announce) document.getElementById('zoom-announcement').textContent = 'Notepad zoom ' + zoom + ' percent';
  }
  function change(value) {
    zoom = Math.max(80, Math.min(160, value)); apply(true);
    try { localStorage.setItem(key, String(zoom)); } catch { /* Keep session zoom. */ }
  }
  out.addEventListener('click', () => change(zoom - 10));
  into.addEventListener('click', () => change(zoom + 10));
  reset.addEventListener('click', () => change(100));
  apply();
})();
