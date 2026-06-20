import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, evaluateAchievements } from '../public/js/achievements.js';

const base = { progress: { xp: 0, streak: 0, achievements: [] }, wallet: { portfolio: {} }, behavior: {} };

test('ACHIEVEMENTS define id/label/icon/check', () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.id && a.label && a.icon && typeof a.check === 'function');
  }
});

test('estado vacío no cumple ningún logro', () => {
  assert.deepEqual(evaluateAchievements(base), []);
});

test('xp>=50 desbloquea primer_quiz', () => {
  const s = { ...base, progress: { ...base.progress, xp: 50 } };
  assert.ok(evaluateAchievements(s).includes('primer_quiz'));
});

test('3 tickers desbloquean diversificado', () => {
  const s = { ...base, wallet: { portfolio: { A: { cantidad: 1 }, B: { cantidad: 2 }, C: { cantidad: 1 } } } };
  assert.ok(evaluateAchievements(s).includes('diversificado'));
});

test('streak>=3 desbloquea racha3', () => {
  const s = { ...base, progress: { ...base.progress, streak: 3 } };
  assert.ok(evaluateAchievements(s).includes('racha3'));
});
