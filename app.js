'use strict';
(() => {
  const questions = window.FDL_QUESTIONS;
  const storageKey = 'fuera-del-libreto-v1';
  const card = document.querySelector('#card');
  const question = document.querySelector('#question');
  const drawLabel = document.querySelector('#draw-label');
  const skip = document.querySelector('#skip-button');
  const progress = document.querySelector('#progress');
  const dialog = document.querySelector('#how-dialog');
  let mood = 'all';
  let seen = new Set();
  let current = null;
  let lastId = null;
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && saved.version === 1) {
      mood = ['all', 'curious', 'personal', 'playful'].includes(saved.mood) ? saved.mood : 'all';
      seen = new Set((Array.isArray(saved.seen) ? saved.seen : []).filter(id => questions.some(q => q.id === id)));
      current = questions.find(q => q.id === saved.current && (mood === 'all' || q.mood === mood)) || null;
      lastId = current?.id || null;
    }
  } catch { storageAvailable = false; }
  const pool = () => questions.filter(q => mood === 'all' || q.mood === mood);
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, mood, seen: [...seen], current: current?.id || null })); }
    catch { storageAvailable = false; }
  }
  function updateProgress(reset = false) {
    const selected = pool();
    const count = selected.filter(q => seen.has(q.id)).length;
    progress.textContent = current ? `${reset ? 'Mazo completo. Volvemos a mezclar. ' : ''}${count} de ${selected.length} tarjetas · ${storageAvailable ? 'Sin repetir hasta terminar el mazo.' : 'Avance guardado solo mientras esta página siga abierta.'}` : `${selected.length.toLocaleString('es-CL')} preguntas distintas. Sin apuro.`;
  }
  function render(animate = false, reset = false) {
    if (current) {
      question.textContent = current.text;
      question.classList.toggle('long', current.text.length > 65);
      question.classList.toggle('extra-long', current.text.length > 95);
      document.querySelector('#card-label').textContent = 'PREGÚNTALE A QUIEN ESTÁ CONTIGO';
      document.querySelector('#card-category').textContent = current.category;
      document.querySelector('#card-number').textContent = String(current.id).padStart(3, '0');
      drawLabel.textContent = 'Otra tarjeta';
      skip.hidden = false;
    } else {
      question.replaceChildren(document.createTextNode('Una pregunta puede llevarte a '));
      const em = document.createElement('em'); em.textContent = 'cualquier parte.'; question.append(em);
      question.classList.remove('long', 'extra-long');
      document.querySelector('#card-label').textContent = 'MIL PREGUNTAS. CERO GUION.';
      document.querySelector('#card-category').textContent = '¿Vemos qué sale?';
      document.querySelector('#card-number').textContent = '001 — 1000';
      drawLabel.textContent = 'Saca una tarjeta';
      skip.hidden = true;
    }
    card.setAttribute('aria-label', current ? 'Sacar otra tarjeta' : 'Sacar una tarjeta');
    if (animate) { card.classList.remove('deal'); void card.offsetWidth; card.classList.add('deal'); }
    updateProgress(reset);
  }
  function draw() {
    const selected = pool();
    let remaining = selected.filter(q => !seen.has(q.id));
    let reset = false;
    if (!remaining.length) {
      selected.forEach(q => seen.delete(q.id));
      remaining = selected.filter(q => q.id !== lastId);
      if (!remaining.length) remaining = selected;
      reset = true;
    }
    let random;
    if (globalThis.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      const limit = Math.floor(4294967296 / remaining.length) * remaining.length;
      do { crypto.getRandomValues(value); } while (value[0] >= limit);
      random = value[0] % remaining.length;
    } else random = Math.floor(Math.random() * remaining.length);
    current = remaining[random];
    lastId = current.id;
    seen.add(current.id);
    persist(); render(true, reset);
  }
  document.querySelector(`input[value="${mood}"]`).checked = true;
  document.querySelector('#draw-button').addEventListener('click', draw);
  skip.addEventListener('click', draw);
  card.addEventListener('click', draw);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); draw(); }
  });
  document.querySelector('#filters').addEventListener('change', event => {
    mood = event.target.value; current = null; persist(); render();
  });
  document.querySelector('#how-button').addEventListener('click', () => dialog.showModal());
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  document.querySelector('#lets-play').addEventListener('click', () => { dialog.close(); if (!current) draw(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  render();
})();
