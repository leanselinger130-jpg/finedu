import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChallengeLink, parseChallengeHash } from '../public/js/challenge.js';

test('buildChallengeLink arma el link con name y xp', () => {
  const url = buildChallengeLink('Santi', 250, 'https://finedufce.netlify.app');
  assert.equal(url, 'https://finedufce.netlify.app/#/challenge?n=Santi&xp=250');
});

test('buildChallengeLink escapa el nombre', () => {
  const url = buildChallengeLink('Flor Finanzas', 100, 'https://x');
  assert.match(url, /n=Flor%20Finanzas/);
});

test('parseChallengeHash lee name y xp', () => {
  assert.deepEqual(parseChallengeHash('#/challenge?n=Santi&xp=250'), { name: 'Santi', xp: 250 });
  assert.deepEqual(parseChallengeHash('#/challenge?n=Flor%20F&xp=100'), { name: 'Flor F', xp: 100 });
});

test('parseChallengeHash devuelve null si no es un desafío válido', () => {
  assert.equal(parseChallengeHash('#/home'), null);
  assert.equal(parseChallengeHash('#/challenge?n=Santi'), null); // falta xp
  assert.equal(parseChallengeHash('#/challenge?xp=abc'), null);  // xp inválido
});
