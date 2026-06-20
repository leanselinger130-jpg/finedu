import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carteraFor, localProfile, fraudHeuristic, chatFallback, parsePipe } from '../netlify/functions/_lib/fallbacks.js';

test('carteraFor devuelve una cartera por perfil con porcentajes', () => {
  for (const p of ['Conservador', 'Moderado', 'Agresivo']) {
    const c = carteraFor(p);
    assert.ok(Array.isArray(c) && c.length >= 2);
    const total = c.reduce((s, x) => s + x.pct, 0);
    assert.equal(total, 100);
  }
});

test('localProfile detecta pánico (ventasEnBaja) como Conservador', () => {
  const r = localProfile({ ventasEnBaja: 3, comprasEnAlza: 0, scoreRiesgo: 20, turnos: 5 }, {});
  assert.equal(r.perfil, 'Conservador');
  assert.equal(r.source, 'fallback');
  assert.ok(r.dictamen.length > 10);
  assert.ok(Array.isArray(r.cartera));
});

test('localProfile detecta FOMO (comprasEnAlza) como Agresivo', () => {
  const r = localProfile({ ventasEnBaja: 0, comprasEnAlza: 3, scoreRiesgo: 2, turnos: 5 }, {});
  assert.equal(r.perfil, 'Agresivo');
});

test('localProfile sin señales usa scoreRiesgo', () => {
  assert.equal(localProfile({ scoreRiesgo: 2 }, {}).perfil, 'Conservador');
  assert.equal(localProfile({ scoreRiesgo: 10 }, {}).perfil, 'Moderado');
  assert.equal(localProfile({ scoreRiesgo: 20 }, {}).perfil, 'Agresivo');
});

test('fraudHeuristic marca señales de estafa como SOSPECHOSO', () => {
  const r = fraudHeuristic('Invertí y duplicá tu dinero sin riesgo, rendimiento garantizado');
  assert.equal(r.veredicto, 'SOSPECHOSO');
  assert.match(r.motivo.toLowerCase(), /cnv/);
});

test('fraudHeuristic reconoce brokers conocidos como PRECAUCIÓN', () => {
  const r = fraudHeuristic('cocos capital');
  assert.equal(r.veredicto, 'PRECAUCIÓN');
});

test('chatFallback devuelve un mensaje no vacío', () => {
  assert.ok(chatFallback().length > 20);
});

test('parsePipe separa etiqueta y texto', () => {
  assert.deepEqual(parsePipe('AGRESIVO|toma mucho riesgo'), ['AGRESIVO', 'toma mucho riesgo']);
  assert.deepEqual(parsePipe('sin pipe'), ['sin pipe', '']);
});
