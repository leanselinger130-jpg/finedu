import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyNewsImpact, portfolioValue, positionReturnPct,
  totalInvestedCost, totalReturnPct, quickAmountQty, benchmarkReturnPct,
} from '../public/js/sim-engine.js';

test('applyNewsImpact aplica el impacto nombrado y respeta el piso 1000', () => {
  const prices = [{ ticker: 'A', precio: 1000 }, { ticker: 'B', precio: 5000 }];
  const news = { impacto: { 'A': -50, 'B': 20 } };
  const out = applyNewsImpact(prices, news, () => 0.5);
  assert.equal(out[0].precio, 1000);       // 1000*0.5=500 -> piso 1000
  assert.equal(out[0].delta, -50);
  assert.equal(out[1].precio, 6000);       // 5000*1.2
  assert.equal(out[1].delta, 20);
  assert.equal(prices[0].precio, 1000);    // no mutó la entrada
});

test('applyNewsImpact usa rng para tickers no nombrados', () => {
  const prices = [{ ticker: 'C', precio: 10000 }];
  const news = { impacto: {} };
  const out = applyNewsImpact(prices, news, () => 0); // floor(0*9)-4 = -4
  assert.equal(out[0].delta, -4);
  assert.equal(out[0].precio, 9600);       // 10000*0.96
});

test('portfolioValue suma solo holdings con cantidad>0', () => {
  const portfolio = { A: { cantidad: 2, precioCompra: 100 }, B: { cantidad: 0, precioCompra: 50 } };
  const prices = [{ ticker: 'A', precio: 150 }, { ticker: 'B', precio: 50 }];
  assert.equal(portfolioValue(portfolio, prices), 300);
});

test('positionReturnPct calcula el rendimiento porcentual', () => {
  assert.equal(positionReturnPct(100, 150), 50);
  assert.equal(positionReturnPct(200, 150), -25);
});

test('totalInvestedCost suma cantidad*precioCompra', () => {
  const portfolio = { A: { cantidad: 2, precioCompra: 100 }, B: { cantidad: 1, precioCompra: 300 } };
  assert.equal(totalInvestedCost(portfolio), 500);
});

test('totalReturnPct compara valor actual contra costo invertido', () => {
  const portfolio = { A: { cantidad: 2, precioCompra: 100 } }; // costo 200
  const prices = [{ ticker: 'A', precio: 150 }];               // valor 300
  assert.equal(totalReturnPct(portfolio, prices), 50);
  assert.equal(totalReturnPct({}, prices), 0);                 // sin costo -> 0
});

test('quickAmountQty calcula unidades enteras por fracción de efectivo', () => {
  assert.equal(quickAmountQty(10000, 3000, 1), 3);   // floor(10000/3000)
  assert.equal(quickAmountQty(10000, 3000, 0.5), 1); // floor(5000/3000)
  assert.equal(quickAmountQty(10000, 0, 1), 0);      // precio inválido
});

test('benchmarkReturnPct usa primero y último de la serie', () => {
  assert.equal(benchmarkReturnPct([100, 110, 120]), 20);
  assert.equal(benchmarkReturnPct([100]), 0);
  assert.equal(benchmarkReturnPct([]), 0);
  assert.equal(benchmarkReturnPct([0, 50]), 0);
});
