'use strict';
(() => {
  const questions = window.FDL_QUESTIONS;
  const storageKey = 'fuera-del-libreto-v1';
  const scene = document.querySelector('#table-scene');
  const box = document.querySelector('#box-button');
  const deck = document.querySelector('#deck');
  const card = document.querySelector('#card');
  const flyer = document.querySelector('#card-flyer');
  const face = document.querySelector('#question-face');
  const question = document.querySelector('#question');
  const drawButton = document.querySelector('#draw-button');
  const drawLabel = document.querySelector('#draw-label');
  const skip = document.querySelector('#skip-button');
  const hint = document.querySelector('#table-hint');
  const progress = document.querySelector('#progress');
  const announcement = document.querySelector('#announcement');
  const dialog = document.querySelector('#how-dialog');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const validIds = new Set(questions.map(q => q.id));
  let seen = new Set();
  let current = null;
  let revealed = false;
  let stage = 'closed';
  let busy = false;
  let lastId = null;
  let storageAvailable = true;
  let resetMessage = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved?.version === 1) {
      seen = new Set((Array.isArray(saved.seen) ? saved.seen : []).filter(id => validIds.has(id)));
      current = questions.find(q => q.id === saved.current) || null;
      // Every visit starts with the box and the card face down; keep the saved question and progress.
      revealed = false;
      lastId = current?.id || null;
    }
  } catch { storageAvailable = false; }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, seen: [...seen], current: current?.id || null, revealed })); }
    catch { storageAvailable = false; }
  }
  function render() {
    scene.dataset.stage = stage;
    const open = stage !== 'closed';
    deck.hidden = !open;
    box.disabled = open;
    box.tabIndex = open ? -1 : 0;
    box.setAttribute('aria-hidden', String(open));
    card.classList.toggle('is-revealed', revealed);
    face.setAttribute('aria-hidden', String(!revealed));
    face.inert = !revealed;
    card.setAttribute('aria-label', revealed ? 'Volver a poner la tarjeta boca abajo' : 'Dar vuelta la tarjeta');
    drawLabel.textContent = !open ? 'Abramos la caja' : revealed ? 'Saca otra tarjeta' : 'Dale vuelta';
    hint.textContent = !open ? 'Las buenas conversaciones empiezan abriendo una caja.' : revealed ? 'Hazle esta pregunta a quien está contigo.' : 'Ya está en tus manos. Tócala y veamos qué sale.';
    skip.hidden = !open || !revealed;
    if (current) {
      question.textContent = current.text;
      question.classList.toggle('long', current.text.length > 65);
      question.classList.toggle('extra-long', current.text.length > 95);
      document.querySelector('#card-number').textContent = String(current.id).padStart(3, '0');
    }
    progress.textContent = !open ? '1.000 preguntas. Una caja llena de sorpresas.' : `${resetMessage ? 'Mazo completo. Volvemos a mezclar. ' : ''}${seen.size} de 1000 descubiertas · ${storageAvailable ? 'Sin repetir hasta terminar el mazo.' : 'Avance guardado solo mientras esta página siga abierta.'}`;
  }
  function pick() {
    let remaining = questions.filter(q => !seen.has(q.id) && q.id !== lastId);
    resetMessage = false;
    if (!remaining.length) {
      // An unrevealed last card is still available; a fully seen deck starts a new round.
      if (seen.size < questions.length) remaining = questions.filter(q => !seen.has(q.id));
      else { seen.clear(); remaining = questions.filter(q => q.id !== lastId); resetMessage = true; }
    }
    let index;
    if (globalThis.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      const limit = Math.floor(4294967296 / remaining.length) * remaining.length;
      do { crypto.getRandomValues(value); } while (value[0] >= limit);
      index = value[0] % remaining.length;
    } else index = Math.floor(Math.random() * remaining.length);
    current = remaining[index]; lastId = current.id; revealed = false;
  }
  async function animate(element, frames, options) {
    if (reducedMotion.matches) return;
    try { await element.animate(frames, options).finished; } catch { /* A canceled visual effect does not interrupt the game. */ }
  }
  function announce(text) { announcement.textContent = text; }
  async function openBox() {
    if (busy || stage !== 'closed') return;
    busy = true;
    scene.classList.add('box-opening');
    announce('Abriendo la caja de cartas.');
    await animate(document.querySelector('.box-lid'), [
      { transform: 'translate(0, 0) rotate(-5deg)', opacity: 1 },
      { transform: 'translate(20px, -65px) rotate(9deg)', opacity: 1, offset: .45 },
      { transform: 'translate(110px, -170px) rotate(22deg)', opacity: 0 }
    ], { duration: 680, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'forwards' });
    stage = 'open';
    if (!current) pick();
    persist(); render();
    await animate(flyer, [
      { transform: 'translateY(140px) rotate(-16deg) scale(.78)', opacity: 0 },
      { transform: 'translateY(-25px) rotate(5deg) scale(1.02)', opacity: 1, offset: .72 },
      { transform: 'translateY(0) rotate(0) scale(1)', opacity: 1 }
    ], { duration: 720, easing: 'cubic-bezier(.2,.75,.25,1)' });
    scene.classList.remove('box-opening'); busy = false;
    if (revealed) announce(current.text); else announce('Tarjeta boca abajo. Tócala para darle vuelta.');
    // Move focus only when opening hid the focused box.
    if (document.activeElement === box || document.activeElement === document.body) card.focus({ preventScroll: true });
  }
  function flip() {
    if (busy || stage === 'closed') return;
    revealed = !revealed;
    if (revealed) seen.add(current.id);
    persist(); render();
    announce(revealed ? `Pregúntale a quien está contigo: ${current.text}` : 'Tarjeta boca abajo. Puedes volver a darle vuelta.');
    if (revealed && !reducedMotion.matches) {
      scene.classList.remove('celebrate'); void scene.offsetWidth; scene.classList.add('celebrate');
    }
  }
  async function draw() {
    if (busy || stage === 'closed') return;
    busy = true;
    const fromSkip = document.activeElement === skip;
    await animate(flyer, [
      { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
      { transform: 'translate(110px, -65px) rotate(18deg)', opacity: 0 }
    ], { duration: 240, easing: 'ease-in' });
    // Disable the rotation transition while replacing the departing card.
    card.classList.add('no-flip'); pick(); persist(); render();
    void card.offsetWidth; card.classList.remove('no-flip');
    await animate(flyer, [
      { transform: 'translate(-80px, 100px) rotate(-18deg) scale(.85)', opacity: 0 },
      { transform: 'translate(0, -15px) rotate(3deg) scale(1.01)', opacity: 1, offset: .75 },
      { transform: 'translate(0, 0) rotate(0) scale(1)', opacity: 1 }
    ], { duration: 480, easing: 'cubic-bezier(.2,.75,.25,1)' });
    busy = false;
    announce('Nueva tarjeta. Tócala para darle vuelta.');
    if (fromSkip) drawButton.focus({ preventScroll: true });
  }
  function primaryAction() { if (busy) return; if (stage === 'closed') openBox(); else if (!revealed) flip(); else draw(); }
  box.addEventListener('click', openBox);
  drawButton.addEventListener('click', primaryAction);
  skip.addEventListener('click', draw);
  card.addEventListener('click', flip);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); }
  });
  card.addEventListener('pointermove', event => {
    if (busy || !matchMedia('(hover: hover)').matches || reducedMotion.matches) return;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--tilt-x', `${-(event.clientY - bounds.top - bounds.height / 2) / bounds.height * 9}deg`);
    card.style.setProperty('--tilt-y', `${(event.clientX - bounds.left - bounds.width / 2) / bounds.width * 12}deg`);
  });
  card.addEventListener('pointerleave', () => { card.style.setProperty('--tilt-x', '0deg'); card.style.setProperty('--tilt-y', '0deg'); });
  document.querySelector('#how-button').addEventListener('click', () => dialog.showModal());
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  document.querySelector('#lets-play').addEventListener('click', () => { dialog.close(); if (stage === 'closed') openBox(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  render();
})();
