'use strict';
(() => {
  const questions = window.FDL_QUESTIONS;
  const key = 'fuera-del-libreto-v1';
  const validIds = new Set(questions.map(q => q.id));
  const card = document.querySelector('#card');
  const text = document.querySelector('#question');
  const button = document.querySelector('#next-button');
  const dialog = document.querySelector('#how-dialog');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let seen = new Set(), current = null, busy = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved?.version === 1) {
      seen = new Set((Array.isArray(saved.seen) ? saved.seen : []).filter(id => validIds.has(id)));
      if (saved.revealed) current = questions.find(q => q.id === saved.current) || null;
    }
  } catch { /* The game also works without browser storage. */ }
  function pick() {
    const lastId = current?.id;
    let remaining = questions.filter(q => !seen.has(q.id) && q.id !== lastId);
    if (!remaining.length) {
      remaining = questions.filter(q => !seen.has(q.id));
      if (!remaining.length) { seen.clear(); remaining = questions.filter(q => q.id !== lastId); }
    }
    let index;
    if (globalThis.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      const limit = Math.floor(4294967296 / remaining.length) * remaining.length;
      do { crypto.getRandomValues(value); } while (value[0] >= limit);
      index = value[0] % remaining.length;
    } else index = Math.floor(Math.random() * remaining.length);
    current = remaining[index];
  }
  function render() {
    seen.add(current.id);
    text.textContent = current.text;
    text.classList.toggle('long', current.text.length > 65);
    text.classList.toggle('extra-long', current.text.length > 95);
    try { localStorage.setItem(key, JSON.stringify({version:1,seen:[...seen],current:current.id,revealed:true})); } catch { /* Keep playing in memory. */ }
  }
  async function animate(frames, options) {
    if (reducedMotion.matches) return;
    try { await card.animate(frames, options).finished; } catch { /* A canceled animation does not stop play. */ }
  }
  async function next() {
    if (busy) return;
    busy = true; button.disabled = true;
    await animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate(90px,-20px) rotate(9deg)',opacity:0}],{duration:180,easing:'ease-in'});
    pick(); render();
    await animate([{transform:'translate(-35px,25px) rotate(-5deg)',opacity:0},{transform:'translate(0,0) rotate(0)',opacity:1}],{duration:290,easing:'ease-out'});
    document.querySelector('#announcement').textContent = current.text;
    busy = false; button.disabled = false;
  }
  button.addEventListener('click', next);
  document.querySelector('#how-button').addEventListener('click', () => dialog.showModal());
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  document.querySelector('#lets-play').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  if (!current) pick();
  render();
})();
