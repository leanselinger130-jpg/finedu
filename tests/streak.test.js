import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, todayStr } from '../public/js/streak.js';

test('primer uso (sin fecha) arranca racha en 1', () => {
  const r = computeStreak({ streak: 0, lastActiveDate: null }, '2026-06-19');
  assert.deepEqual(r, { streak: 1, lastActiveDate: '2026-06-19' });
});

test('mismo día no cambia la racha', () => {
  const r = computeStreak({ streak: 3, lastActiveDate: '2026-06-19' }, '2026-06-19');
  assert.deepEqual(r, { streak: 3, lastActiveDate: '2026-06-19' });
});

test('día consecutivo suma 1', () => {
  const r = computeStreak({ streak: 3, lastActiveDate: '2026-06-18' }, '2026-06-19');
  assert.deepEqual(r, { streak: 4, lastActiveDate: '2026-06-19' });
});

test('gap mayor a un día reinicia a 1', () => {
  const r = computeStreak({ streak: 9, lastActiveDate: '2026-06-15' }, '2026-06-19');
  assert.deepEqual(r, { streak: 1, lastActiveDate: '2026-06-19' });
});

test('todayStr devuelve YYYY-MM-DD', () => {
  assert.equal(todayStr(new Date('2026-06-19T15:00:00')), '2026-06-19');
});
