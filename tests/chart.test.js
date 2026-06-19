import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seriesToPoints } from '../public/js/chart.js';

test('seriesToPoints mapea el primer y último punto a los bordes', () => {
  const pts = seriesToPoints([0, 10], 100, 20, 0).split(' ');
  assert.equal(pts.length, 2);
  const [x0, y0] = pts[0].split(',').map(Number);
  const [x1, y1] = pts[1].split(',').map(Number);
  assert.equal(x0, 0);        // primer índice -> x=0 (pad 0)
  assert.equal(x1, 100);      // último índice -> x=width
  assert.equal(y0, 20);       // valor mínimo -> abajo (y alto)
  assert.equal(y1, 0);        // valor máximo -> arriba (y bajo)
});

test('seriesToPoints centra una serie plana', () => {
  const pts = seriesToPoints([5, 5, 5], 100, 20, 0).split(' ');
  for (const p of pts) {
    const y = Number(p.split(',')[1]);
    assert.equal(y, 10); // todos al medio
  }
});

test('seriesToPoints devuelve vacío para series cortas', () => {
  assert.equal(seriesToPoints([7], 100, 20), '');
  assert.equal(seriesToPoints([], 100, 20), '');
});
