import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, DEFAULT_STATE, SCHEMA_VERSION } from '../public/js/store.js';

function mockStorage(initial = {}) {
  const m = { ...initial };
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, _dump: () => m };
}

test('store nuevo arranca con el estado por defecto', () => {
  const s = createStore(mockStorage());
  assert.equal(s.get('wallet.cash'), DEFAULT_STATE.wallet.cash);
  assert.equal(s.getState().progress.xp, 0);
});

test('set persiste el valor en storage', () => {
  const storage = mockStorage();
  const s = createStore(storage);
  s.set('wallet.cash', 50000);
  assert.equal(s.get('wallet.cash'), 50000);
  const saved = JSON.parse(storage._dump()['finedu-state']);
  assert.equal(saved.wallet.cash, 50000);
});

test('update muta y persiste', () => {
  const storage = mockStorage();
  const s = createStore(storage);
  s.update((st) => { st.progress.xp += 50; });
  assert.equal(s.get('progress.xp'), 50);
  const saved = JSON.parse(storage._dump()['finedu-state']);
  assert.equal(saved.progress.xp, 50);
});

test('carga estado existente desde storage', () => {
  const st = { ...structuredClone(DEFAULT_STATE), schemaVersion: SCHEMA_VERSION };
  st.wallet.cash = 12345;
  const storage = mockStorage({ 'finedu-state': JSON.stringify(st) });
  const s = createStore(storage);
  assert.equal(s.get('wallet.cash'), 12345);
});

test('migra estado viejo mergeando sobre el default', () => {
  const old = { schemaVersion: 0, wallet: { cash: 999 } }; // le faltan campos nuevos
  const storage = mockStorage({ 'finedu-state': JSON.stringify(old) });
  const s = createStore(storage);
  assert.equal(s.get('wallet.cash'), 999);                       // conserva lo que había
  assert.deepEqual(s.get('progress.achievements'), []);          // completa lo que faltaba
  assert.equal(s.getState().schemaVersion, SCHEMA_VERSION);      // actualiza versión
});

test('reset vuelve al default', () => {
  const s = createStore(mockStorage());
  s.set('wallet.cash', 1);
  s.reset();
  assert.equal(s.get('wallet.cash'), DEFAULT_STATE.wallet.cash);
});
