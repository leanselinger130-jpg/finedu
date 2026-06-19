// tests/ai-core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAi } from '../netlify/functions/_lib/ai-core.js';

// fetch falso que devuelve un texto de Gemini dado
function fakeFetch(text, ok = true) {
  return async () => ({
    ok,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  });
}

test('chat sin apiKey usa fallback', async () => {
  const r = await handleAi({ body: { intent: 'chat', messages: [] }, apiKey: '', fetchFn: fakeFetch('x') });
  assert.equal(r.source, 'fallback');
  assert.ok(r.reply.length > 10);
});

test('chat con apiKey devuelve el texto de Gemini', async () => {
  const r = await handleAi({ body: { intent: 'chat', messages: [{ role: 'user', text: 'hola' }] }, apiKey: 'k', fetchFn: fakeFetch('Hola, soy tu tutor.') });
  assert.equal(r.source, 'ai');
  assert.equal(r.reply, 'Hola, soy tu tutor.');
});

test('profile con apiKey parsea PERFIL|justificación y adjunta cartera', async () => {
  const r = await handleAi({ body: { intent: 'profile', behavior: {}, portfolio: {} }, apiKey: 'k', fetchFn: fakeFetch('AGRESIVO|Toma mucho riesgo y FOMO.') });
  assert.equal(r.source, 'ai');
  assert.equal(r.perfil, 'Agresivo');
  assert.match(r.dictamen, /riesgo/);
  assert.ok(Array.isArray(r.cartera) && r.cartera.length >= 2);
});

test('fraud con apiKey parsea VEREDICTO|motivo', async () => {
  const r = await handleAi({ body: { intent: 'fraud', input: 'algo.com' }, apiKey: 'k', fetchFn: fakeFetch('SOSPECHOSO|Promete rendimientos garantizados.') });
  assert.equal(r.source, 'ai');
  assert.equal(r.veredicto, 'SOSPECHOSO');
  assert.match(r.motivo, /garantiz/);
});

test('si fetch tira error, cae al fallback del intent', async () => {
  const throwing = async () => { throw new Error('network'); };
  const r = await handleAi({ body: { intent: 'profile', behavior: { ventasEnBaja: 3 }, portfolio: {} }, apiKey: 'k', fetchFn: throwing });
  assert.equal(r.source, 'fallback');
  assert.equal(r.perfil, 'Conservador');
});

test('si la respuesta no es ok, cae al fallback', async () => {
  const r = await handleAi({ body: { intent: 'fraud', input: 'cocos' }, apiKey: 'k', fetchFn: fakeFetch('', false) });
  assert.equal(r.source, 'fallback');
  assert.equal(r.veredicto, 'PRECAUCIÓN');
});

test('intent desconocido cae a chat fallback', async () => {
  const r = await handleAi({ body: { intent: 'otro' }, apiKey: 'k', fetchFn: fakeFetch('x') });
  assert.equal(r.source, 'fallback');
  assert.ok(r.reply);
});
