import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {} };
runInNewContext(readFileSync(resolve(root, 'data/questions.js'), 'utf8'), context);
const questions = context.window.FDL_QUESTIONS;
assert.equal(questions.length, 1000, 'El mazo debe tener exactamente 1.000 preguntas.');
const ids = new Set();
const texts = new Set();
const categories = new Map();
const moods = { curious: 0, personal: 0, playful: 0 };
for (const [index, question] of questions.entries()) {
  assert.equal(question.id, index + 1, 'Los identificadores deben ser estables y consecutivos.');
  assert.ok(!ids.has(question.id), `Identificador duplicado: ${question.id}`);
  ids.add(question.id);
  assert.ok(Object.hasOwn(moods, question.mood), `Tono desconocido: ${question.mood}`);
  moods[question.mood]++;
  assert.equal(typeof question.category, 'string');
  assert.ok(question.category.length > 0);
  categories.set(question.category, (categories.get(question.category) || 0) + 1);
  assert.match(question.text, /^¿[^\n<>]+\?$/, `Pregunta mal formada: ${question.id}`);
  assert.ok(question.text.length >= 25 && question.text.length <= 120, `Revisar la longitud de la tarjeta ${question.id}.`);
  const normalized = question.text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  assert.ok(!texts.has(normalized), `Pregunta repetida: ${question.id}`);
  texts.add(normalized);
}
assert.deepEqual(moods, { curious: 300, personal: 350, playful: 350 });
assert.equal(categories.size, 20);
for (const [category, count] of categories) assert.equal(count, 50, `Cantidad incorrecta en ${category}`);
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const asset = match[1].split('?')[0];
  if (asset === './' || asset.startsWith('https:')) continue;
  assert.ok(!asset.startsWith('/'), `La ruta ${asset} debe ser relativa para GitHub Pages.`);
  assert.ok(existsSync(resolve(root, asset)), `Falta el recurso ${asset}.`);
}
assert.ok(existsSync(resolve(root, '.nojekyll')));
assert.ok(existsSync(resolve(root, 'assets/sofi.png')), 'Falta Sofi en la portada.');
console.log('✓ 1.000 preguntas únicas, 20 temas, tonos y recursos listos para GitHub Pages.');
