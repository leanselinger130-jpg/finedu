import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL, SYSTEM_PROMPTS, buildRequestBody } from '../netlify/functions/_lib/prompts.js';

test('MODEL es gemini-2.5-flash', () => {
  assert.equal(MODEL, 'gemini-2.5-flash');
});

test('hay system prompts para los tres intents', () => {
  for (const k of ['chat', 'profile', 'fraud']) {
    assert.equal(typeof SYSTEM_PROMPTS[k], 'string');
    assert.ok(SYSTEM_PROMPTS[k].length > 20);
  }
});

test('el system prompt de chat aclara que no da consejos reales', () => {
  assert.match(SYSTEM_PROMPTS.chat.toLowerCase(), /no.*consejos|educ/);
});

test('buildRequestBody(chat) mapea messages a roles de Gemini e incluye contexto', () => {
  const body = buildRequestBody('chat', {
    messages: [{ role: 'user', text: 'hola' }, { role: 'bot', text: 'qué tal' }, { role: 'user', text: '¿qué es un CEDEAR?' }],
    context: { cartera: { 'MELI': 2 }, ultimasOps: ['compra MELI'], pantalla: 'sim' },
  });
  assert.equal(body.systemInstruction.parts[0].text, SYSTEM_PROMPTS.chat);
  // el primer turno es el contexto (role user), luego la conversación
  assert.equal(body.contents[0].role, 'user');
  assert.match(body.contents[0].parts[0].text, /MELI/);
  // 'bot' se mapea a 'model'
  const roles = body.contents.map((c) => c.role);
  assert.ok(roles.includes('model'));
  assert.equal(body.contents[body.contents.length - 1].parts[0].text, '¿qué es un CEDEAR?');
});

test('buildRequestBody(profile) incluye los datos de conducta', () => {
  const body = buildRequestBody('profile', { behavior: { ventasEnBaja: 3, comprasEnAlza: 1, turnos: 5, scoreRiesgo: 12 }, portfolio: { MELI: { cantidad: 2 } } });
  assert.equal(body.systemInstruction.parts[0].text, SYSTEM_PROMPTS.profile);
  assert.match(body.contents[0].parts[0].text, /ventasEnBaja|pánico|3/);
});

test('buildRequestBody(fraud) incluye el texto a verificar', () => {
  const body = buildRequestBody('fraud', { input: 'inversiones-seguras-xyz.com' });
  assert.equal(body.systemInstruction.parts[0].text, SYSTEM_PROMPTS.fraud);
  assert.match(body.contents[0].parts[0].text, /inversiones-seguras-xyz\.com/);
});
