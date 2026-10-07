'use strict';
(() => {
  const questions = window.FDL_QUESTIONS;
  const key = 'fuera-del-libreto-v1';
  const validIds = new Set(questions.map(q => q.id));
  const card = document.querySelector('#card');
  const text = document.querySelector('#question');
  const button = document.querySelector('#next-button');
  const dialog = document.querySelector('#how-dialog');
  const welcome = document.querySelector('#welcome');
  const game = document.querySelector('#game');
  const categories = document.querySelector('#categories');
  const topicLabel = document.querySelector('#topic-label');
  let selectedCategory = null, intro = false, introShown = false;
  const deck = document.querySelector('#deck');
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
    const pool = selectedCategory ? questions.filter(q => q.category === selectedCategory) : questions;
    let remaining = pool.filter(q => !seen.has(q.id) && q.id !== lastId);
    if (!remaining.length) {
      remaining = pool.filter(q => !seen.has(q.id));
      if (!remaining.length) { pool.forEach(q => seen.delete(q.id)); remaining = pool.filter(q => q.id !== lastId); }
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
    if (intro) {
      text.textContent = '¿Estamos listos para jugar?';
      text.classList.remove('long','extra-long');
      return;
    }
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
    if (busy || game.hidden) return;
    busy = true; button.disabled = true; document.querySelector('#change-mode').disabled = true;
    await animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate3d(130px,-55px,90px) rotateZ(15deg) rotateY(-22deg)',opacity:0}],{duration:180,easing:'ease-in'});
    intro = false; pick(); render();
    await animate([{transform:'translate3d(-30px,60px,-100px) rotateZ(-7deg) rotateX(18deg)',opacity:0},{transform:'translate(0,0) rotate(0)',opacity:1}],{duration:290,easing:'ease-out'});
    document.querySelector('#announcement').textContent = current.text;
    busy = false; button.disabled = false; document.querySelector('#change-mode').disabled = false;
  }
  function show(screen) {
    welcome.hidden = screen !== welcome;
    categories.hidden = screen !== categories;
    game.hidden = screen !== game;
    window.scrollTo({top:0,behavior:'auto'});
  }
  function startRandom() {
    selectedCategory = null;
    intro = !introShown;
    introShown = true;
    if (!intro) pick();
    render(); topicLabel.textContent = 'Lo que salga';
    show(game); button.focus({preventScroll:true});
    document.querySelector('#announcement').textContent = text.textContent;
  }
  function showCategories() {
    show(categories);
    document.querySelector('#categories-title').focus({preventScroll:true});
  }
  document.querySelector('#random-button').addEventListener('click', startRandom);
  document.querySelector('#safe-button').addEventListener('click', showCategories);
  document.querySelector('#categories-back').addEventListener('click', () => {show(welcome); document.querySelector('#safe-button').focus({preventScroll:true});});
  document.querySelector('#change-mode').addEventListener('click', () => {
    if (busy) return;
    if (selectedCategory) showCategories();
    else {show(welcome); document.querySelector('#random-button').focus({preventScroll:true});}
  });
  for (const category of new Set(questions.map(q => q.category))) {
    const option = document.createElement('button');
    option.className = 'category-button';
    option.textContent = category;
    option.addEventListener('click', () => {
      selectedCategory = category; intro = false;
      pick(); render(); topicLabel.textContent = category;
      show(game); button.focus({preventScroll:true});
      document.querySelector('#announcement').textContent = current.text;
    });
    document.querySelector('#category-grid').append(option);
  }
  deck.addEventListener('pointermove', event => {
    if (busy || reducedMotion.matches || !matchMedia('(hover:hover)').matches) return;
    const r=deck.getBoundingClientRect();
    deck.style.setProperty('--rx', `${-(event.clientY-r.top-r.height/2)/r.height*9}deg`);
    deck.style.setProperty('--ry', `${(event.clientX-r.left-r.width/2)/r.width*11}deg`);
  });
  deck.addEventListener('pointerleave', () => {deck.style.setProperty('--rx','0deg');deck.style.setProperty('--ry','0deg');});
  button.addEventListener('click', next);
  document.querySelector('#how-button').addEventListener('click', () => dialog.showModal());
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  document.querySelector('#lets-play').addEventListener('click', () => { dialog.close(); if (game.hidden && categories.hidden) { show(welcome); document.querySelector('#random-button').focus({preventScroll:true}); } });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  // Questions are drawn only when a mode is entered, never behind the welcome screen.
})();
