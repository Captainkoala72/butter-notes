(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const editor = $('#editor');
  const title = $('#note-title');
  const prefix = 'butter.note.v1.';
  const activeKey = 'butter.active.v1';
  let notes = [], activeId, saveTimer, toastTimer, selection, deletedNote, dirty = false;
  let storageHealthy = true;
  let countdownTimer;
  const newId = () => crypto.randomUUID();
  const plain = (html) => { const doc = new DOMParser().parseFromString(html, 'text/html'); doc.querySelectorAll('div,p,li,br').forEach(el => el.append(' ')); return (doc.body.textContent || '').replace(/\s+/g,' ').trim(); };
  const words = (text) => text.trim() ? text.trim().split(/\s+/u).length : 0;
  const label = (note) => note.title.trim() || 'Untitled note';
  const current = () => notes.find(note => note.id === activeId);
  // Stored markup is never trusted. Keep only the editor's text formatting.
  function sanitize(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const allowed = new Set(['B','STRONG','I','EM','U','S','BR','P','DIV','SPAN','FONT','UL','OL','LI']);
    const clean = document.createElement('div');
    function visit(node, target) {
      if (node.nodeType === Node.TEXT_NODE) { target.append(document.createTextNode(node.textContent)); return; }
      if (node.nodeType !== Node.ELEMENT_NODE || ['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH'].includes(node.tagName)) return;
      if (!allowed.has(node.tagName)) { [...node.childNodes].forEach(child => visit(child, target)); return; }
      const copy = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === 'FONT') {
        if (/^[1-7]$/.test(node.getAttribute('size') || '')) copy.setAttribute('size', node.getAttribute('size'));
        if (CSS.supports('color', node.getAttribute('color') || '')) copy.setAttribute('color', node.getAttribute('color'));
      }
      for (const property of ['color','font-size','font-weight','font-style','text-decoration-line']) {
        const value = node.style.getPropertyValue(property);
        if (value && CSS.supports(property, value)) copy.style.setProperty(property, value);
      }
      [...node.childNodes].forEach(child => visit(child, copy)); target.append(copy);
    }
    [...doc.body.childNodes].forEach(node => visit(node, clean)); return clean.innerHTML;
  }
  function loadNotes() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith(prefix)) continue;
        try {
          const note = JSON.parse(localStorage.getItem(key));
          if (note && typeof note.id === 'string' && typeof note.title === 'string' && typeof note.html === 'string' && Number.isFinite(note.created) && Number.isFinite(note.updated)) {
            note.html = sanitize(note.html); notes.push(note);
          }
        } catch { /* A broken record must not prevent other pages from loading. */ }
      }
      activeId = localStorage.getItem(activeKey);
    } catch { storageHealthy = false; }
    notes.sort((a,b) => b.updated - a.updated);
    if (!notes.length) {
      const now = Date.now();
      notes.push({ id: newId(), title: 'A fresh page', html: '<div>A little space for whatever is on your mind.</div><div><br></div><div>A fleeting thought. A big idea. Your list for today.</div><div>Put it here, and make a little room.</div><div><br></div><div><b>Make yourself at home.</b></div><div>Start typing, or select some text to make it your own.</div><div>Your notes save automatically as you go.</div><div><br></div><div><i>Good things start with a blank page.</i></div>', created: now, updated: now });
      activeId = notes[0].id; persist(notes[0]);
    }
    if (!current()) activeId = notes[0].id;
  }
  function status(message, error = false) {
    clearInterval(countdownTimer);
    const indicator = $('#autosave-indicator');
    indicator.textContent = message;
    indicator.classList.toggle('error', error);
    indicator.classList.remove('pending');
    const element = $('#save-status'); element.replaceChildren();
    const dot = document.createElement('span'); dot.className = 'status-dot';
    element.append(dot, document.createTextNode(message)); element.classList.toggle('error', error);
  }
  function persist(note) {
    try { const serialized = JSON.stringify(note); if (localStorage.getItem(prefix + note.id) !== serialized) localStorage.setItem(prefix + note.id, serialized); storageHealthy = true; dirty = false; status('Saved to this browser'); return true; }
    catch { storageHealthy = false; dirty = true; status('Not saved — download a copy', true); return false; }
  }
  function capture() { const note = current(); if (!note) return false; const html = editor.innerHTML; if (note.title === title.value && note.html === html) return false; note.title = title.value; note.html = html; note.updated = Date.now(); dirty = true; return true; }
  function flush() { clearTimeout(saveTimer); if (dirty) { capture(); return persist(current()); } return storageHealthy; }
  function saveActiveChoice() { try { if (localStorage.getItem(activeKey) !== activeId) localStorage.setItem(activeKey, activeId); } catch { /* Note persistence reports errors independently. */ } }
  function renderList() {
    const list = $('#notes-list'); list.replaceChildren();
    const query = $('#search').value.toLowerCase().trim();
    const filtered = notes.filter(note => (label(note) + ' ' + plain(note.html)).toLowerCase().includes(query));
    $('#note-count').textContent = notes.length;
    for (const note of filtered) {
      const button = document.createElement('button'); button.className = 'note-card' + (note.id === activeId ? ' active' : '');
      button.setAttribute('aria-current', note.id === activeId ? 'page' : 'false');
      const name = document.createElement('span'); name.className = 'card-title'; name.textContent = label(note);
      const preview = document.createElement('span'); preview.className = 'card-preview'; preview.textContent = plain(note.html) || 'A blank page. All yours.';
      const bottom = document.createElement('span'); bottom.className = 'card-bottom';
      const date = new Date(note.updated).toLocaleDateString(undefined,{month:'short',day:'numeric'});
      bottom.textContent = date;
      if (note.id === activeId) { const marker = document.createElement('span'); marker.textContent = 'EDITING'; bottom.append(marker); }
      button.append(name,preview,bottom); button.addEventListener('click', () => openNote(note.id)); list.append(button);
    }
    if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'empty-search'; empty.textContent = 'No notes found. Try a different word.'; list.append(empty); }
  }
  function updateMeta() {
    $('#breadcrumb-title').textContent = label(current());
    const count = words(editor.innerText); $('#word-count').textContent = count + (count === 1 ? ' word' : ' words');
  }
  function openNote(id) {
    if (current() && dirty && !flush()) { toast('This note could not be saved. Download it before switching.'); return; }
    activeId = id; selection = null; const note = current();
    title.value = note.title; editor.innerHTML = sanitize(note.html); dirty = false;
    $('#note-date').textContent = new Date(note.created).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}).toUpperCase();
    $('#page-number').textContent = 'PAGE ' + String(notes.length - notes.indexOf(note)).padStart(2,'0');
    updateMeta(); renderList(); saveActiveChoice(); closeSidebar(); syncToolbar();
    $('.paper').classList.remove('page-enter'); requestAnimationFrame(() => $('.paper').classList.add('page-enter'));
    status(storageHealthy ? 'Saved to this browser' : 'Not saved — download a copy', !storageHealthy);
  }
  function changed() {
    if (!capture()) return;
    status('Unsaved changes…'); updateMeta();
    clearTimeout(saveTimer); saveTimer = setTimeout(() => { persist(current()); renderList(); }, 5000);
    const deadline = Date.now() + 5000;
    const indicator = $('#autosave-indicator');
    indicator.classList.add('pending');
    function tick() {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      const message = seconds ? 'Autosaving in ' + seconds + 's' : 'Saving…';
      if (indicator.textContent !== message) indicator.textContent = message;
    }
    tick(); countdownTimer = setInterval(tick, 1000);
  }
  function createNote() {
    if (!flush()) { toast('Download your current note first — browser storage is unavailable.'); return; }
    const now = Date.now(); const note = {id:newId(),title:'',html:'',created:now,updated:now};
    if (!persist(note)) { dirty = false; toast('Could not create a saved page. Download your notes to free up browser storage.'); return; }
    notes.unshift(note); $('#search').value = ''; openNote(note.id); title.focus();
  }
  function rememberSelection() {
    const selected = window.getSelection();
    if (selected.rangeCount && editor.contains(selected.anchorNode) && editor.contains(selected.focusNode)) selection = selected.getRangeAt(0).cloneRange();
  }
  function restoreSelection() {
    editor.focus(); const selected = window.getSelection();
    if (selection && editor.contains(selection.commonAncestorContainer)) { selected.removeAllRanges(); selected.addRange(selection); }
    else { const range = document.createRange(); range.selectNodeContents(editor); range.collapse(false); selected.removeAllRanges(); selected.addRange(range); }
  }
  function command(name,value = null) {
    restoreSelection(); document.execCommand(name,false,value); rememberSelection(); changed(); syncToolbar();
  }
  function syncToolbar() {
    const selected = window.getSelection(); const inEditor = selected && editor.contains(selected.anchorNode);
    document.querySelectorAll('[data-command][aria-pressed]').forEach(button => button.setAttribute('aria-pressed', String(!!inEditor && document.queryCommandState(button.dataset.command))));
    if (inEditor) {
      const value = document.queryCommandValue('fontSize'); if (['2','3','5','6'].includes(value)) $('#font-size').value = value;
      const color = document.queryCommandValue('foreColor');
      const normalized = value => { const el = document.createElement('span'); el.style.color = value; return el.style.color; };
      document.querySelectorAll('[data-color]').forEach(button => { const active = normalized(button.dataset.color) === normalized(color); button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active)); });
    }
  }
  function toast(message, undo = false) {
    clearTimeout(toastTimer); $('#toast-message').textContent = message; $('#undo-delete').hidden = !undo; $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, undo ? 12000 : 3500);
  }
  function closeSidebar() { document.body.classList.remove('sidebar-open'); $('#scrim').hidden = true; }
  $('#new-note').addEventListener('click',createNote);
  title.addEventListener('input',changed); editor.addEventListener('input',changed);
  editor.addEventListener('paste', event => { event.preventDefault(); command('insertText', event.clipboardData.getData('text/plain')); });
  editor.addEventListener('drop', event => event.preventDefault());
  document.addEventListener('selectionchange', () => { rememberSelection(); syncToolbar(); });
  document.querySelectorAll('[data-command]').forEach(button => { button.addEventListener('mousedown',event => event.preventDefault()); button.addEventListener('click',() => command(button.dataset.command)); });
  document.querySelectorAll('[data-color]').forEach(button => { button.addEventListener('mousedown',event => event.preventDefault()); button.addEventListener('click',() => command('foreColor',button.dataset.color)); });
  $('#font-size').addEventListener('change',event => command('fontSize',event.target.value));
  $('#search').addEventListener('input',renderList);
  $('#save-note').addEventListener('click',() => { capture(); const saved = flush(); renderList(); toast(saved ? 'All tucked away. Your note is saved.' : 'Storage is full or unavailable. Download a copy to keep your note.'); });
  $('#focus').addEventListener('click',() => { const on = document.body.classList.toggle('focus-mode'); $('#focus').setAttribute('aria-pressed',String(on)); closeSidebar(); });
  $('#menu').addEventListener('click',() => { document.body.classList.add('sidebar-open'); $('#scrim').hidden = false; });
  $('#scrim').addEventListener('click',closeSidebar);
  $('#download').addEventListener('click',() => {
    capture(); flush(); const note = current(); const safeTitle = document.createElement('div'); safeTitle.textContent = label(note);
    const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + safeTitle.innerHTML + '</title><style>body{max-width:760px;margin:50px auto;padding:30px;background:#fff4be;color:#3e3a2d;font-family:system-ui;line-height:1.8;overflow-wrap:anywhere}h1{font-family:Georgia,serif}font[size="2"]{font-size:13px}font[size="3"]{font-size:16px}font[size="5"]{font-size:24px}font[size="6"]{font-size:30px}</style><h1>' + safeTitle.innerHTML + '</h1>' + sanitize(note.html) + '</html>';
    const url = URL.createObjectURL(new Blob([html],{type:'text/html'})); const link = document.createElement('a'); link.href = url; link.download = (label(note).replace(/[^a-z0-9 _-]/gi,'').trim().slice(0,80) || 'butter-note') + '.html'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); toast('Your note is ready to keep.');
  });
  $('#delete-note').addEventListener('click',() => { $('#delete-description').textContent = 'Delete “' + label(current()) + '”? You can undo this immediately afterward.'; $('#delete-dialog').showModal(); });
  $('#delete-dialog').addEventListener('close',() => {
    if ($('#delete-dialog').returnValue !== 'delete') return;
    clearTimeout(saveTimer); capture(); const note = current();
    try { localStorage.removeItem(prefix + note.id); } catch { toast('Could not delete from browser storage. Your note is still here.'); return; }
    deletedNote = {...note}; dirty = false; notes = notes.filter(item => item.id !== note.id);
    if (!notes.length) { const now = Date.now(); const blank = {id:newId(),title:'',html:'',created:now,updated:now}; notes.push(blank); persist(blank); }
    openNote(notes[0].id); toast('Page removed.',true);
  });
  $('#undo-delete').addEventListener('click',() => {
    if (!deletedNote || !flush()) return;
    const note = deletedNote; if (!persist(note)) return; notes.unshift(note); deletedNote = null; $('#search').value = ''; openNote(note.id); toast('Your page is back.');
  });
  document.addEventListener('keydown',event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); $('#save-note').click(); }
    if (event.altKey && event.key.toLowerCase() === 'n') { event.preventDefault(); createNote(); }
    if (event.key === 'Escape') { closeSidebar(); if (document.body.classList.contains('focus-mode')) $('#focus').click(); }
    if (event.key === '/' && !event.target.closest('input,textarea,[contenteditable]')) { event.preventDefault(); document.body.classList.remove('focus-mode'); document.body.classList.add('sidebar-open'); $('#scrim').hidden = false; $('#search').focus(); }
  });
  document.addEventListener('visibilitychange',() => { if (document.hidden) flush(); });
  window.addEventListener('pagehide',flush);
  window.addEventListener('beforeunload',event => { if (!flush() && dirty) { event.preventDefault(); event.returnValue = ''; } });
  // Other tabs cannot silently overwrite an open draft. Reconcile on the next reload.
  window.addEventListener('storage',event => { if (event.key?.startsWith(prefix)) toast('Notes changed in another tab. Reload to see those changes.'); });
  loadNotes(); openNote(activeId);
})();
