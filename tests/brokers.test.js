import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BROKERS } from '../public/js/data/brokers.js';
import { brokerPreset } from '../public/js/theme.js';

test('BROKERS tiene default, cocos y balanz con brand y logo', () => {
  for (const id of ['default', 'cocos', 'balanz']) {
    assert.equal(BROKERS[id].id, id);
    assert.match(BROKERS[id].brand, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(BROKERS[id].logo.length > 0);
  }
});

test('brokerPreset devuelve el preset por id (case-insensitive)', () => {
  assert.equal(brokerPreset('COCOS').id, 'cocos');
  assert.equal(brokerPreset('balanz').name, 'Balanz');
});

test('brokerPreset cae a default si el id no existe o es null', () => {
  assert.equal(brokerPreset('inexistente').id, 'default');
  assert.equal(brokerPreset(null).id, 'default');
});
