'use strict';
(() => {
  const questions = window.FDL_QUESTIONS;
  const storageKey = 'fuera-del-libreto-v1';
  const $ = selector => document.querySelector(selector);
  const welcome = $('#welcome');
  const game = $('#game-screen');
  const table = $('#play-table');
  const choices = $('#choices');
  const single = $('#single-card');
  const card = $('#card');
  const face = $('#question-face');
  const reverse = $('#card-reverse');
  const question = $('#question');
  const drawButton = $('#draw-button');
  const skip = $('#skip-button');
  const dialog = $('#how-dialog');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const validIds = new Set(questions.map(q => q.id));
  let seen = new Set();
  let current = null;
  let lastId = null;
  let stage = 'choice';
  let revealed = false;
  let busy = false;
  let storageAvailable = true;
  let resetMessage = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved?.version === 1) {
      seen = new Set((Array.isArray(saved.seen) ? saved.seen : []).filter(id => validIds.has(id)));
      current = questions.find(q => q.id === saved.current) || null;
      lastId = current?.id || null;
    }
  } catch { storageAvailable = false; }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, seen: [...seen], current: current?.id || null, revealed })); }
    catch { storageAvailable = false; }
  }
  function setBusy(value) {
    busy = value;
    drawButton.disabled = value;
    $('#back-home').disabled = value;
    choices.querySelectorAll('button').forEach(button => { button.disabled = value; });
    skip.disabled = value;
    card.setAttribute('aria-disabled', String(value));
  }
  function announce(text) { $('#announcement').textContent = text; }
  function render() {
    const choosing = stage === 'choice';
    table.dataset.stage = stage;
    choices.hidden = !choosing;
    single.hidden = choosing;
    $('#actions').hidden = choosing;
    face.hidden = !revealed;
    reverse.hidden = revealed;
    face.inert = !revealed;
    face.setAttribute('aria-hidden', String(!revealed));
    card.setAttribute('aria-label', revealed ? 'Volver a poner la tarjeta boca abajo' : 'Dar vuelta la tarjeta');
    $('#game-title').textContent = choosing ? '¿Cuál te tinca?' : revealed ? 'Te toca escuchar.' : 'Dale vuelta.';
    $('#draw-label').textContent = revealed ? 'Elige otra carta' : 'Dale vuelta';
    $('#draw-button > span:last-child').textContent = revealed ? '→' : '↻';
    $('#sofi-tip').textContent = choosing ? 'Elige la que te tinque. La sorpresa está al otro lado.' : revealed ? 'Léele la pregunta a la otra persona. Después cambian de turno.' : 'Ahora tócala para darle vuelta. ¡Veamos qué sale!';
    skip.hidden = choosing || !revealed;
    if (current) {
      question.textContent = current.text;
      question.classList.toggle('long', current.text.length > 65);
      question.classList.toggle('extra-long', current.text.length > 95);
      $('#card-number').textContent = String(current.id).padStart(3, '0');
    }
    $('#progress').textContent = `${resetMessage ? 'Mazo completo. Volvemos a mezclar. ' : ''}${seen.size ? `${seen.size} de 1000 descubiertas` : '1.000 preguntas mezcladas'} · ${storageAvailable ? 'Sin repetir hasta terminar el mazo.' : 'Avance guardado solo mientras esta página siga abierta.'}`;
  }
  function pick() {
    let remaining = questions.filter(q => !seen.has(q.id) && q.id !== lastId);
    resetMessage = false;
    if (!remaining.length) {
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
    try { await element.animate(frames, options).finished; } catch { /* Canceled decoration does not interrupt the game. */ }
  }
  function enterGame() {
    if (busy) return;
    welcome.hidden = true; game.hidden = false;
    stage = 'choice'; revealed = false; resetMessage = false; render();
    game.classList.remove('screen-enter'); void game.offsetWidth; game.classList.add('screen-enter');
    window.scrollTo({ top: 0, behavior: 'auto' });
    $('#game-title').focus({ preventScroll: true });
    announce('Elige una de las tres cartas.');
  }
  function backHome() {
    if (busy) return;
    game.hidden = true; welcome.hidden = false;
    welcome.classList.remove('screen-enter'); void welcome.offsetWidth; welcome.classList.add('screen-enter');
    window.scrollTo({ top: 0, behavior: 'auto' });
    $('#enter-game').focus({ preventScroll: true });
  }
  async function choose(color) {
    if (busy || game.hidden || stage !== 'choice') return;
    setBusy(true); stage = 'card'; single.dataset.color = color;
    pick(); persist(); render();
    await animate(single, [
      { transform: 'translateY(75px) rotate(-12deg) scale(.85)', opacity: 0 },
      { transform: 'translateY(-12px) rotate(3deg) scale(1.02)', opacity: 1, offset: .72 },
      { transform: 'translateY(0) rotate(0) scale(1)', opacity: 1 }
    ], { duration: 470, easing: 'cubic-bezier(.2,.75,.25,1)' });
    setBusy(false);
    announce('Tu carta está boca abajo. Tócala para darle vuelta.');
    if (!dialog.open) card.focus({ preventScroll: true });
  }
  async function flip() {
    if (busy || game.hidden || stage !== 'card') return;
    setBusy(true);
    // Switch explicit visible faces halfway through a 2D flip; no stacked 3D layers or lingering box.
    await animate(card, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(.06) rotate(-3deg)' }], { duration: 170, easing: 'ease-in' });
    revealed = !revealed;
    if (revealed) seen.add(current.id);
    persist(); render();
    await animate(card, [
      { transform: 'scaleX(.06) rotate(3deg)' },
      { transform: 'scaleX(1.03) rotate(-1deg)', offset: .8 },
      { transform: 'scaleX(1) rotate(0)' }
    ], { duration: 260, easing: 'ease-out' });
    setBusy(false);
    announce(revealed ? `Pregúntale a quien está contigo: ${current.text}` : 'Carta boca abajo. Puedes volver a darle vuelta.');
    if (revealed && !reducedMotion.matches) { table.classList.remove('celebrate'); void table.offsetWidth; table.classList.add('celebrate'); }
    if (document.activeElement === skip && skip.hidden) drawButton.focus({ preventScroll: true });
  }
  async function another() {
    if (busy || game.hidden || stage !== 'card') return;
    setBusy(true);
    await animate(single, [
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: 'translate(80px,-45px) rotate(15deg)', opacity: 0 }
    ], { duration: 260, easing: 'ease-in' });
    stage = 'choice'; revealed = false; resetMessage = false; persist(); render();
    await animate(choices, [{ transform: 'translateY(22px) scale(.95)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' });
    setBusy(false);
    announce('Ahora elige otra carta.');
    if (!dialog.open) choices.querySelector('button').focus({ preventScroll: true });
  }
  $('#enter-game').addEventListener('click', enterGame);
  $('#back-home').addEventListener('click', backHome);
  $('#home-link').addEventListener('click', event => { event.preventDefault(); backHome(); });
  choices.querySelectorAll('button').forEach(button => { button.addEventListener('click', () => choose(button.dataset.color)); });
  drawButton.addEventListener('click', () => revealed ? another() : flip());
  skip.addEventListener('click', another);
  card.addEventListener('click', flip);
  card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); } });
  card.addEventListener('pointermove', event => {
    if (busy || reducedMotion.matches || !matchMedia('(hover: hover)').matches) return;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--card-tilt', `${(event.clientX - bounds.left - bounds.width / 2) / bounds.width * 3}deg`);
  });
  card.addEventListener('pointerleave', () => card.style.setProperty('--card-tilt', '0deg'));
  $('#how-button').addEventListener('click', () => dialog.showModal());
  $('#close-dialog').addEventListener('click', () => dialog.close());
  $('#lets-play').addEventListener('click', () => { dialog.close(); if (game.hidden) enterGame(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  render();
})();
