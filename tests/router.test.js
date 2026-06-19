import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute } from '../public/js/router.js';

const ROUTES = ['home', 'sim', 'quiz', 'league', 'dashboard', 'profile'];

test('resuelve un hash valido', () => {
  assert.equal(resolveRoute('#/sim', ROUTES, 'home'), 'sim');
});
test('hash vacio cae al fallback', () => {
  assert.equal(resolveRoute('', ROUTES, 'home'), 'home');
});
test('ruta desconocida cae al fallback', () => {
  assert.equal(resolveRoute('#/inexistente', ROUTES, 'home'), 'home');
});
test('ignora parametros despues de la ruta', () => {
  assert.equal(resolveRoute('#/league?score=120', ROUTES, 'home'), 'league');
});
