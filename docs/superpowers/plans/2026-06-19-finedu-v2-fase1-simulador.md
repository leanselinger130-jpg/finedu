# FINEDU v2 — Fase 1: Simulador realista — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar el simulador de "demasiado básico" (frustración #1 de los usuarios) a una experiencia realista: gráficos de precio con historial, persistencia de precios entre recargas, vista de detalle por activo, compra/venta por monto (25/50/100%), P&L claro y gráfico de rendimiento del portafolio en el tiempo.

**Architecture:** Se extrae la lógica pura del simulador a `sim-engine.js` (evolución de precios, P&L, montos rápidos, benchmark) y el dibujo de gráficos a `chart.js` (SVG), ambos con tests unitarios en Node. La vista `sim.js` se reconstruye para consumir esos módulos, persistir precios e historial en el `store`, mostrar mini-gráficos en la lista, y abrir una vista de detalle por activo manejada con estado interno (sin tocar el router). Todo sigue siendo vanilla JS sin build.

**Tech Stack:** JavaScript ES Modules (navegador, sin transpilar), SVG inline para gráficos, `node:test` para lógica pura, localStorage vía `store.js`.

## Global Constraints

- **Sin build step. Sin dependencias de runtime.** ES Modules nativos; los gráficos se dibujan con SVG hecho a mano (nada de librerías de charts).
- **Tipografía:** IBM Plex Sans única, cifras con `tabular-nums` (clase `.tnum`). Sin monoespaciado.
- **Paleta exacta:** fondo `#0F172A`, card `#222735`, borde `#334155`, texto `#F8FAFC`, atenuado `#94A3B8`, oro `#F59E0B`, violeta `#8B5CF6`, verde `#34D399`, rojo `#F87171`. Usar las variables CSS (`var(--gold)` etc.), nunca hex crudo en el JS de vistas.
- **Violeta solo para IA.** En el simulador NO se usa violeta (no hay IA acá en Fase 1). Oro = dinero/valor de portafolio; verde/rojo = ganancia/pérdida.
- **Sin `alert()`/`confirm()` nativos:** usar `toast()` y `confirmModal()` de `ui.js`.
- **Construcción de DOM con `el()` de `ui.js`**; los datos dinámicos van por `text:` (textContent), nunca por `innerHTML`.
- **No romper lo existente:** quiz, liga, dashboard, inicio y chat siguen funcionando igual. Los 10 tests actuales (store + router) siguen verdes.
- **Idioma:** español rioplatense.
- **Cálculos preservados del simulador actual:** precio de compra promedio ponderado `(costoTotalAnterior + precio) / cantidad`; rendimiento `((precioActual - precioCompra)/precioCompra)*100`; contadores `comprasEnAlza` (delta>10), `ventasEnBaja` (delta<-5), `comprasTotales`, `scoreRiesgo += pesoRiesgo`; impacto de noticia `max(1000, round(precio*(1+impacto/100)))`.

---

## File Structure

```
public/js/
  sim-engine.js     NUEVO — lógica pura: evolución de precios, P&L, montos rápidos, benchmark
  chart.js          NUEVO — gráficos SVG: puntos de sparkline (puro) + render de sparkline y line chart
  store.js          MODIF — DEFAULT_STATE.market gana `prices` y `priceHistory`; wallet.valueHistory se usa
  data/market.js    MODIF — cada activo gana un campo `desc` (descripción corta para el detalle)
  views/sim.js      MODIF — reconstrucción: precios persistidos, lista con mini-gráficos, detalle por activo,
                            compra/venta por monto, P&L, gráfico de rendimiento del portafolio
tests/
  sim-engine.test.js  NUEVO — tests de la lógica pura
  chart.test.js       NUEVO — tests de la matemática de puntos del gráfico
```

**Decisión de límites:** la lógica pura (precios, P&L, montos) y la matemática de gráficos (mapear una serie a coordenadas SVG) salen de la vista para poder testearse en Node sin DOM. `sim.js` queda como orquestador de la vista (lista + detalle) y la única pieza que toca el `store` y el DOM. El detalle por activo se maneja con una variable de estado interna de `sim.js` (no una ruta nueva), porque el router actual no pasa parámetros y agregar eso excede el alcance de Fase 1.

---

## Task 1: `sim-engine.js` — lógica pura del simulador (TDD)

**Files:**
- Create: `public/js/sim-engine.js`
- Test: `tests/sim-engine.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `applyNewsImpact(prices, news, rng)` → nuevo array de `{ticker, precio, delta, ...}`. `prices` es un array de objetos con al menos `{ticker, precio}`. `news` es `{impacto: {ticker:number}}`. `rng` es una función que devuelve `[0,1)` (default `Math.random`), usada para el impacto aleatorio `floor(rng()*9)-4` cuando el ticker no está en la noticia. Cada activo: `delta = impacto`; `precio = max(1000, round(precio*(1+impacto/100)))`. Devuelve copias nuevas (no muta la entrada).
  - `portfolioValue(portfolio, prices)` → number. Suma `cantidad * precioActual` de cada holding con `cantidad>0`. `portfolio` es `{ticker:{cantidad, precioCompra}}`.
  - `positionReturnPct(precioCompra, precioActual)` → number = `((precioActual - precioCompra)/precioCompra)*100`.
  - `totalInvestedCost(portfolio)` → number = suma de `cantidad*precioCompra`.
  - `totalReturnPct(portfolio, prices)` → number = `((valorActual - costoInvertido)/costoInvertido)*100`, o `0` si `costoInvertido===0`.
  - `quickAmountQty(cash, precio, fraction)` → integer = `floor((cash*fraction)/precio)` acotado a `>=0`; `0` si `precio<=0`.
  - `benchmarkReturnPct(history)` → number: dado un array de números (serie de precios del benchmark), `((ultimo - primero)/primero)*100`, o `0` si hay menos de 2 puntos o el primero es 0.

- [ ] **Step 1: Escribir los tests que fallan**

```js
// tests/sim-engine.test.js
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
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existe `sim-engine.js`).

- [ ] **Step 3: Implementar `public/js/sim-engine.js`**

```js
// sim-engine.js — lógica pura del simulador (sin DOM, sin store)
export function applyNewsImpact(prices, news, rng = Math.random) {
  const impacto = (news && news.impacto) || {};
  return prices.map((a) => {
    const base = impacto[a.ticker] !== undefined
      ? impacto[a.ticker]
      : Math.floor(rng() * 9) - 4;
    return { ...a, delta: base, precio: Math.max(1000, Math.round(a.precio * (1 + base / 100))) };
  });
}

export function portfolioValue(portfolio, prices) {
  let total = 0;
  for (const ticker of Object.keys(portfolio || {})) {
    const h = portfolio[ticker];
    if (h && h.cantidad > 0) {
      const a = prices.find((p) => p.ticker === ticker);
      if (a) total += h.cantidad * a.precio;
    }
  }
  return total;
}

export function positionReturnPct(precioCompra, precioActual) {
  return ((precioActual - precioCompra) / precioCompra) * 100;
}

export function totalInvestedCost(portfolio) {
  let total = 0;
  for (const ticker of Object.keys(portfolio || {})) {
    const h = portfolio[ticker];
    if (h && h.cantidad > 0) total += h.cantidad * h.precioCompra;
  }
  return total;
}

export function totalReturnPct(portfolio, prices) {
  const cost = totalInvestedCost(portfolio);
  if (cost === 0) return 0;
  return ((portfolioValue(portfolio, prices) - cost) / cost) * 100;
}

export function quickAmountQty(cash, precio, fraction) {
  if (!precio || precio <= 0) return 0;
  return Math.max(0, Math.floor((cash * fraction) / precio));
}

export function benchmarkReturnPct(history) {
  if (!Array.isArray(history) || history.length < 2) return 0;
  const first = history[0];
  const last = history[history.length - 1];
  if (!first) return 0;
  return ((last - first) / first) * 100;
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test`
Expected: PASAN los 7 tests de `sim-engine.test.js` (y siguen los 10 previos).

- [ ] **Step 5: Commit**

```bash
git add public/js/sim-engine.js tests/sim-engine.test.js
git commit -m "feat(fase1): sim-engine con logica pura de precios, P&L y montos (TDD)"
```

---

## Task 2: `chart.js` — gráficos SVG (matemática pura testeada + render)

**Files:**
- Create: `public/js/chart.js`
- Test: `tests/chart.test.js`

**Interfaces:**
- Consumes: `el` de `ui.js` (solo para el render; la matemática no depende de nada).
- Produces:
  - `seriesToPoints(series, width, height, pad = 2)` → string de puntos `"x,y x,y ..."` para un `<polyline>`. Mapea linealmente el índice al eje X (de `pad` a `width-pad`) y el valor al eje Y **invertido** (valor máximo arriba). Si todos los valores son iguales, la línea va horizontal al medio. Si `series` tiene <2 puntos, devuelve `""`.
  - `renderSparkline(series, { width = 56, height = 20, color = 'var(--green)' })` → elemento `<svg>` con un `<polyline>`. Devuelve un SVG vacío si la serie es corta.
  - `renderLineChart(series, { width = 300, height = 120, color = 'var(--gold)' })` → elemento `<svg>` con la línea, un área tenue debajo, y etiquetas de valor min/max. Para series cortas (<2) devuelve un `<div>` con la clase `.sub` y el texto "Sin datos suficientes todavía.".

- [ ] **Step 1: Escribir los tests de la parte pura**

```js
// tests/chart.test.js
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
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existe `chart.js`).

- [ ] **Step 3: Implementar `public/js/chart.js`**

```js
// chart.js — gráficos SVG hechos a mano (sin librerías)
import { el } from './ui.js';

const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function seriesToPoints(series, width, height, pad = 2) {
  if (!Array.isArray(series) || series.length < 2) return '';
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return series.map((v, i) => {
    const x = pad + (innerW * i) / (series.length - 1);
    const y = span === 0
      ? pad + innerH / 2
      : pad + innerH * (1 - (v - min) / span);
    return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
  }).join(' ');
}

export function renderSparkline(series, { width = 56, height = 20, color = 'var(--green)' } = {}) {
  const svg = svgEl('svg', { width, height, viewBox: `0 0 ${width} ${height}` });
  const pts = seriesToPoints(series, width, height);
  if (pts) {
    svg.appendChild(svgEl('polyline', {
      points: pts, fill: 'none', stroke: color, 'stroke-width': '1.5',
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
  }
  return svg;
}

export function renderLineChart(series, { width = 300, height = 120, color = 'var(--gold)' } = {}) {
  if (!Array.isArray(series) || series.length < 2) {
    return el('div', { class: 'sub center', text: 'Sin datos suficientes todavía.', style: 'padding:24px 0;font-size:12px;' });
  }
  const pad = 8;
  const pts = seriesToPoints(series, width, height, pad);
  const svg = svgEl('svg', { width: '100%', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', style: 'display:block;' });
  // área tenue
  const firstX = pad, lastX = width - pad;
  const area = svgEl('polygon', {
    points: `${firstX},${height - pad} ${pts} ${lastX},${height - pad}`,
    fill: color, opacity: '0.12',
  });
  const line = svgEl('polyline', {
    points: pts, fill: 'none', stroke: color, 'stroke-width': '2',
    'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  });
  svg.append(area, line);
  return svg;
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test`
Expected: PASAN los 3 tests de `chart.test.js`.

- [ ] **Step 5: Commit**

```bash
git add public/js/chart.js tests/chart.test.js
git commit -m "feat(fase1): chart.js con sparkline y line chart en SVG (matematica testeada)"
```

---

## Task 3: `store.js` — persistir precios e historial de mercado

**Files:**
- Modify: `public/js/store.js`
- Test: `tests/store.test.js` (agregar un test)

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `DEFAULT_STATE.market` ahora incluye `prices: []` y `priceHistory: {}`. `DEFAULT_STATE.wallet.valueHistory` ya existe como `[]`. La migración (deepMerge) completa estas claves en estados viejos sin romper.

- [ ] **Step 1: Escribir el test que falla**

Agregar este test al final de `tests/store.test.js`:

```js
test('DEFAULT_STATE incluye market.prices, market.priceHistory y wallet.valueHistory', () => {
  const s = createStore(mockStorage());
  assert.deepEqual(s.get('market.prices'), []);
  assert.deepEqual(s.get('market.priceHistory'), {});
  assert.deepEqual(s.get('wallet.valueHistory'), []);
});
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA el nuevo test (`market.prices` es `undefined`).

- [ ] **Step 3: Modificar `DEFAULT_STATE` en `public/js/store.js`**

Cambiar el objeto `market` y confirmar `wallet`:

```js
// dentro de DEFAULT_STATE:
  wallet: { cash: 100000, portfolio: {}, valueHistory: [] },
  market: { turn: 0, currentNews: null, prices: [], priceHistory: {} },
```

(El resto de `DEFAULT_STATE` queda igual.)

- [ ] **Step 4: Correr los tests**

Run: `npm test`
Expected: PASAN todos (incluido el nuevo y la migración, que es additiva).

- [ ] **Step 5: Commit**

```bash
git add public/js/store.js tests/store.test.js
git commit -m "feat(fase1): store persiste precios e historial de mercado"
```

---

## Task 4: `market.js` — descripción corta por activo

**Files:**
- Modify: `public/js/data/market.js`

**Interfaces:**
- Consumes: nada.
- Produces: cada objeto de `ASSETS` gana un campo `desc` (string corto). Los demás campos (`ticker, tipo, precio, delta, pesoRiesgo`) quedan idénticos. `NEWS` no cambia.

- [ ] **Step 1: Agregar `desc` a cada activo en `ASSETS`**

Reemplazar el array `ASSETS` por (mismos valores + `desc`):

```js
export const ASSETS = [
    { ticker: "SPY (S&P 500)", tipo: "ETF CEDEAR", precio: 12000, delta: 0, pesoRiesgo: 2, desc: "Réplica del índice S&P 500: las 500 mayores empresas de EE.UU. en una sola operación. La opción más diversificada y defensiva." },
    { ticker: "QQQ (Nasdaq)", tipo: "ETF CEDEAR", precio: 15000, delta: 0, pesoRiesgo: 3, desc: "Sigue al Nasdaq-100, fuertemente tecnológico. Más crecimiento y más volatilidad que el S&P 500." },
    { ticker: "GOOGL (Google)", tipo: "CEDEAR Tech", precio: 8000, delta: 0, pesoRiesgo: 3, desc: "Acción de Alphabet (Google). Gigante de publicidad digital, búsqueda e inteligencia artificial." },
    { ticker: "MSFT (Microsoft)", tipo: "CEDEAR Tech", precio: 16000, delta: 0, pesoRiesgo: 3, desc: "Microsoft: software, nube (Azure) e IA. Ingresos recurrentes y balance sólido." },
    { ticker: "MELI (Mercado Libre)", tipo: "CEDEAR Latam", precio: 25000, delta: 0, pesoRiesgo: 4, desc: "Líder de e-commerce y fintech (Mercado Pago) en Latinoamérica. Alto crecimiento, alta volatilidad." },
    { ticker: "VIST (Vista Energy)", tipo: "CEDEAR O&G", precio: 11000, delta: 0, pesoRiesgo: 4, desc: "Petrolera enfocada en Vaca Muerta. Su valor depende del precio del crudo y del costo de extracción." },
    { ticker: "YMCXO (YPF ON)", tipo: "ON Dólar Cable", precio: 5000, delta: 0, pesoRiesgo: 1, desc: "Obligación Negociable de YPF en dólares: renta fija que paga intereses periódicos. El activo más conservador de la lista." }
];
```

- [ ] **Step 2: Verificar que importa y los campos siguen**

Run: `node -e "import('./public/js/data/market.js').then(m=>console.log(m.ASSETS.length, m.ASSETS.every(a=>a.desc&&a.precio&&a.ticker)))"`
Expected: imprime `7 true`.

- [ ] **Step 3: Commit**

```bash
git add public/js/data/market.js
git commit -m "feat(fase1): descripcion corta por activo para la vista de detalle"
```

---

## Task 5: `sim.js` — lista con gráficos, precios persistidos y rendimiento

**Files:**
- Modify: `public/js/views/sim.js` (reconstrucción completa del archivo)

**Interfaces:**
- Consumes: `el`, `toast` (ui.js); `ASSETS`, `NEWS` (data/market.js); `applyNewsImpact`, `portfolioValue`, `positionReturnPct`, `totalReturnPct`, `benchmarkReturnPct` (sim-engine.js); `renderSparkline`, `renderLineChart` (chart.js); `store`.
- Produces: `renderSim(container, { store })` que: lee/siembra `market.prices` desde el store (no más variable de módulo), muestra el efectivo, el valor del portafolio, el **rendimiento total %** y **vs benchmark (SPY)**, un **gráfico de rendimiento del portafolio** (de `wallet.valueHistory`), el cable de noticias, el botón "Avanzar tiempo", y la **pizarra de activos con mini-gráfico (sparkline)** por fila. Mantiene las tenencias con P&L. Expone (vía `data-ticker` y handler) la apertura del detalle (implementado en Task 6, que agrega `renderDetail`). Persiste precios, `priceHistory` y `valueHistory` en cada "Avanzar tiempo".

Este task reescribe `sim.js`. Pegá el archivo completo:

- [ ] **Step 1: Reescribir `public/js/views/sim.js`**

```js
// sim.js — Vista Simulador (Fase 1: precios persistidos, gráficos, detalle, P&L)
import { el, toast } from '../ui.js';
import { ASSETS, NEWS } from '../data/market.js';
import {
  applyNewsImpact, portfolioValue, positionReturnPct,
  totalReturnPct, benchmarkReturnPct, quickAmountQty,
} from '../sim-engine.js';
import { renderSparkline, renderLineChart } from '../chart.js';

const BENCHMARK = 'SPY (S&P 500)';

// Estado de navegación interno de la vista (lista vs detalle). No es una ruta.
let selectedTicker = null;

// --- Helpers de estado de mercado en el store ---
function getPrices(store) {
  let prices = store.get('market.prices');
  if (!prices || prices.length === 0) {
    prices = ASSETS.map((a) => ({ ...a }));
    store.set('market.prices', prices);
    // Sembrar el historial con el precio inicial de cada activo
    const hist = {};
    prices.forEach((a) => { hist[a.ticker] = [a.precio]; });
    store.set('market.priceHistory', hist);
  }
  return prices;
}

export function renderSim(container, { store }) {
  if (selectedTicker) { renderDetail(container, store, selectedTicker); return; }
  renderList(container, store);
}

function renderList(container, store) {
  const prices = getPrices(store);
  const cash = store.get('wallet.cash');
  const portfolio = store.get('wallet.portfolio') || {};
  const turn = store.get('market.turn') || 0;
  const valueHistory = store.get('wallet.valueHistory') || [];
  const priceHistory = store.get('market.priceHistory') || {};
  const newsText = store.get('market.currentNews') ||
    'El mercado arranca en calma. Analizá las empresas antes de avanzar el tiempo.';

  const portValue = portfolioValue(portfolio, prices);
  const totalRet = totalReturnPct(portfolio, prices);
  const benchRet = benchmarkReturnPct(priceHistory[BENCHMARK] || []);

  container.innerHTML = '';

  // Encabezado: efectivo + valor portafolio
  const header = el('div', { class: 'card', style: 'display:flex;justify-content:space-between;align-items:center;' }, [
    el('div', {}, [
      el('div', { class: 'sub', text: 'Efectivo disponible', style: 'font-size:10px;font-weight:600;' }),
      el('div', { class: 'tnum', text: '$' + cash.toLocaleString('es-AR'), style: 'font-size:18px;font-weight:700;color:var(--green);' }),
    ]),
    el('div', { style: 'text-align:right;' }, [
      el('div', { class: 'sub', text: 'Valor portafolio', style: 'font-size:10px;font-weight:600;' }),
      el('div', { class: 'tnum', text: '$' + portValue.toLocaleString('es-AR'), style: 'font-size:18px;font-weight:700;color:var(--gold);' }),
    ]),
  ]);

  // Tarjeta de rendimiento + gráfico del portafolio
  const retColor = totalRet >= 0 ? 'var(--green)' : 'var(--red)';
  const retSign = totalRet >= 0 ? '+' : '';
  const benchSign = benchRet >= 0 ? '+' : '';
  const perfCard = el('div', { class: 'card' }, [
    el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;' }, [
      el('div', {}, [
        el('span', { class: 'sub', text: 'Tu rendimiento', style: 'font-size:11px;font-weight:600;' }),
        el('div', { class: 'tnum', text: retSign + totalRet.toFixed(1) + '%', style: `font-size:22px;font-weight:700;color:${retColor};` }),
      ]),
      el('div', { style: 'text-align:right;' }, [
        el('span', { class: 'sub', text: 'Mercado (SPY)', style: 'font-size:11px;' }),
        el('div', { class: 'tnum sub', text: benchSign + benchRet.toFixed(1) + '%', style: 'font-size:13px;font-weight:600;' }),
      ]),
    ]),
    renderLineChart(valueHistory.map((p) => p.value), { color: retColor }),
  ]);

  // Cable de noticias
  const newsBox = el('div', { class: 'card', style: 'border-style:dashed;font-size:13px;line-height:1.5;' }, [
    el('b', { text: '📰 Cable de Noticias:' }), el('br'),
    el('span', { text: newsText, style: 'color:var(--sub);' }),
  ]);

  const btnAvanzar = el('button', {
    class: 'btn btn-secondary', style: 'margin-bottom:6px;',
    text: '⏳ Avanzar tiempo (nueva noticia y volatilidad)',
    onclick: () => avanzarTiempo(container, store),
  });
  const turnoBadge = el('div', { class: 'sub', text: `Turno ${turn}`, style: 'font-size:11px;text-align:right;margin-bottom:10px;' });

  // Pizarra de activos con sparkline
  const list = el('div', {});
  prices.forEach((asset) => {
    const serie = priceHistory[asset.ticker] || [asset.precio];
    const up = asset.delta >= 0;
    const pillClass = up ? 'pill pill-up' : 'pill pill-down';
    const sign = up ? '+' : '';
    const short = asset.ticker.split(' ')[0];
    const row = el('div', {
      class: 'card', style: 'display:flex;align-items:center;gap:10px;padding:12px;cursor:pointer;margin-bottom:8px;',
      'data-ticker': asset.ticker,
      onclick: () => { selectedTicker = asset.ticker; renderSim(container, { store }); },
    }, [
      el('div', { style: 'flex:1;' }, [
        el('b', { text: short, style: 'font-size:14px;' }),
        el('div', { class: 'sub', text: asset.tipo, style: 'font-size:10px;' }),
      ]),
      renderSparkline(serie, { color: up ? 'var(--green)' : 'var(--red)' }),
      el('div', { style: 'text-align:right;min-width:78px;' }, [
        el('div', { class: 'tnum', text: '$' + asset.precio.toLocaleString('es-AR'), style: 'font-size:13px;font-weight:600;' }),
        el('span', { class: pillClass, text: sign + asset.delta + '%' }),
      ]),
    ]);
    list.appendChild(row);
  });

  // Tenencias con P&L
  const holdings = el('div', {});
  const keys = Object.keys(portfolio).filter((t) => portfolio[t].cantidad > 0);
  if (keys.length === 0) {
    holdings.appendChild(el('div', { class: 'sub center', text: 'No tenés activos comprados todavía.', style: 'padding:12px;font-size:13px;' }));
  } else {
    keys.forEach((ticker) => {
      const h = portfolio[ticker];
      const a = prices.find((p) => p.ticker === ticker);
      if (!a) return;
      const ret = positionReturnPct(h.precioCompra, a.precio);
      const cls = ret >= 0 ? 'pill pill-up' : 'pill pill-down';
      const sign = ret >= 0 ? '+' : '';
      holdings.appendChild(el('div', { style: 'display:flex;justify-content:space-between;padding:9px 4px;border-bottom:1px solid var(--border);' }, [
        el('div', {}, [
          el('b', { text: ticker.split(' ')[0] }),
          el('span', { class: 'sub', text: `  ${h.cantidad} u.`, style: 'font-size:11px;' }),
        ]),
        el('div', { style: 'text-align:right;' }, [
          el('span', { class: 'tnum', text: '$' + (h.cantidad * a.precio).toLocaleString('es-AR'), style: 'font-size:13px;' }),
          el('span', { class: cls, text: '  ' + sign + ret.toFixed(1) + '%', style: 'margin-left:6px;' }),
        ]),
      ]));
    });
  }

  container.append(
    el('h2', { text: 'Simulador', style: 'margin-bottom:14px;' }),
    header, perfCard, newsBox, btnAvanzar, turnoBadge,
    el('h3', { text: 'Pizarra de activos', style: 'font-size:14px;margin:4px 0 8px;color:var(--sub);' }),
    el('p', { class: 'sub', text: 'Tocá un activo para ver su detalle y operar.', style: 'font-size:11px;margin:0 0 10px;' }),
    list,
    el('h3', { text: 'Tus tenencias', style: 'font-size:14px;margin:14px 0 4px;color:var(--sub);' }),
    holdings,
  );
}

// --- Avanzar tiempo: evoluciona precios, persiste historial y valor del portafolio ---
function avanzarTiempo(container, store) {
  const prices = getPrices(store);
  const noticia = NEWS[Math.floor(Math.random() * NEWS.length)];
  const nuevos = applyNewsImpact(prices, noticia);

  store.update((s) => {
    s.market.prices = nuevos;
    s.market.turn = (s.market.turn || 0) + 1;
    s.market.currentNews = noticia.text;
    s.behavior.turnos = (s.behavior.turnos || 0) + 1;
    // Append al historial de precios por activo
    s.market.priceHistory = s.market.priceHistory || {};
    nuevos.forEach((a) => {
      const arr = s.market.priceHistory[a.ticker] || [];
      arr.push(a.precio);
      s.market.priceHistory[a.ticker] = arr.slice(-30); // últimos 30 puntos
    });
    // Append al historial de valor del portafolio
    const val = portfolioValue(s.wallet.portfolio || {}, nuevos);
    s.wallet.valueHistory = (s.wallet.valueHistory || []).concat([{ turn: s.market.turn, value: val }]).slice(-30);
  });

  renderSim(container, { store });
}

// renderDetail se implementa en Task 6.
```

Nota: `renderDetail` todavía no existe; el handler de cada fila setea `selectedTicker` y llama `renderSim`, que en `renderSim` desvía a `renderDetail`. Para que el archivo cargue en Task 5 sin romper al tocar una fila, agregá un stub temporal al final del archivo:

```js
function renderDetail(container, store, ticker) {
  // Stub temporal (Task 6 lo reemplaza). Vuelve a la lista.
  selectedTicker = null;
  renderList(container, store);
}
```

- [ ] **Step 2: Verificar que parsea y que el motor/gráfico importan**

Run: `node --check public/js/views/sim.js`
Expected: sin salida (OK).

Run: `npm test`
Expected: 20/20 (10 previos + 7 sim-engine + 3 chart) siguen verdes.

- [ ] **Step 3: Commit**

```bash
git add public/js/views/sim.js
git commit -m "feat(fase1): simulador con sparklines, precios persistidos, rendimiento y benchmark"
```

---

## Task 6: `sim.js` — vista de detalle por activo con compra/venta por monto

**Files:**
- Modify: `public/js/views/sim.js` (reemplazar el stub `renderDetail` y la lógica de compra/venta)

**Interfaces:**
- Consumes: lo mismo que Task 5 (incluye `quickAmountQty` ya importado).
- Produces: `renderDetail(container, store, ticker)` real: encabezado con botón volver, nombre y tipo, **gráfico grande** (`renderLineChart` del `priceHistory` del activo), precio actual + variación, descripción (`asset.desc`), tu posición (cantidad + P&L si tenés), y controles de **compra/venta por cantidad** con botones rápidos **25% / 50% / 100%** del efectivo y botones **Comprar**/**Vender**. Las operaciones preservan los cálculos del simulador (promedio ponderado, contadores de conducta) y persisten en el store.

- [ ] **Step 1: Reemplazar el stub `renderDetail` por la implementación real**

Borrá el stub temporal de Task 5 y agregá esta función (y la función `operar` de apoyo):

```js
function renderDetail(container, store, ticker) {
  const prices = getPrices(store);
  const asset = prices.find((a) => a.ticker === ticker);
  if (!asset) { selectedTicker = null; renderList(container, store); return; }

  const cash = store.get('wallet.cash');
  const portfolio = store.get('wallet.portfolio') || {};
  const priceHistory = store.get('market.priceHistory') || {};
  const holding = portfolio[ticker];
  const serie = priceHistory[ticker] || [asset.precio];
  const up = asset.delta >= 0;
  const sign = up ? '+' : '';

  container.innerHTML = '';

  const back = el('button', {
    class: 'btn btn-ghost', style: 'width:auto;margin-bottom:12px;padding:8px 14px;',
    text: '← Volver a la pizarra',
    onclick: () => { selectedTicker = null; renderSim(container, { store }); },
  });

  const head = el('div', { style: 'margin-bottom:10px;' }, [
    el('h2', { text: ticker.split(' ')[0], style: 'margin:0;' }),
    el('div', { class: 'sub', text: asset.ticker.replace(/^[^(]*/, '').replace(/[()]/g, '') + ' · ' + asset.tipo, style: 'font-size:12px;' }),
  ]);

  const priceRow = el('div', { style: 'display:flex;align-items:baseline;gap:10px;margin:6px 0 12px;' }, [
    el('span', { class: 'tnum', text: '$' + asset.precio.toLocaleString('es-AR'), style: 'font-size:26px;font-weight:700;color:var(--gold);' }),
    el('span', { class: up ? 'pill pill-up' : 'pill pill-down', text: sign + asset.delta + '%' }),
  ]);

  const chartCard = el('div', { class: 'card' }, [renderLineChart(serie, { color: up ? 'var(--green)' : 'var(--red)' })]);
  const descCard = el('div', { class: 'card', style: 'font-size:13px;line-height:1.5;color:var(--sub);' }, [el('span', { text: asset.desc || '' })]);

  // Tu posición
  let posCard;
  if (holding && holding.cantidad > 0) {
    const ret = positionReturnPct(holding.precioCompra, asset.precio);
    const cls = ret >= 0 ? 'pill pill-up' : 'pill pill-down';
    const rs = ret >= 0 ? '+' : '';
    posCard = el('div', { class: 'card' }, [
      el('div', { class: 'sub', text: 'Tu posición', style: 'font-size:11px;font-weight:600;margin-bottom:4px;' }),
      el('div', { style: 'display:flex;justify-content:space-between;' }, [
        el('span', { class: 'tnum', text: `${holding.cantidad} u. · compra $${Math.round(holding.precioCompra).toLocaleString('es-AR')}` }),
        el('span', { class: cls, text: rs + ret.toFixed(1) + '%' }),
      ]),
    ]);
  } else {
    posCard = el('div', { class: 'sub', text: 'Todavía no tenés este activo.', style: 'font-size:12px;margin:4px 0 10px;' });
  }

  // Selector de cantidad + montos rápidos
  const qtyInput = el('input', {
    type: 'number', min: '1', value: '1',
    style: 'width:100%;padding:10px;border-radius:12px;border:1px solid var(--border);background:var(--navy);color:var(--fg);margin-bottom:8px;',
  });
  const quick = el('div', { style: 'display:flex;gap:8px;margin-bottom:10px;' },
    [['25%', 0.25], ['50%', 0.5], ['100%', 1]].map(([label, frac]) =>
      el('button', {
        class: 'btn btn-ghost', style: 'flex:1;justify-content:center;margin:0;padding:8px;font-size:12px;',
        text: label,
        onclick: () => { qtyInput.value = String(Math.max(1, quickAmountQty(cash, asset.precio, frac))); },
      })));

  const buyBtn = el('button', {
    class: 'btn btn-primary', style: 'flex:1;justify-content:center;margin:0;',
    text: 'Comprar', onclick: () => operar(container, store, ticker, 'COMPRA', parseInt(qtyInput.value, 10)),
  });
  const sellBtn = el('button', {
    class: 'btn btn-secondary', style: 'flex:1;justify-content:center;margin:0;',
    text: 'Vender', onclick: () => operar(container, store, ticker, 'VENTA', parseInt(qtyInput.value, 10)),
  });
  const actions = el('div', { style: 'display:flex;gap:10px;' }, [buyBtn, sellBtn]);

  container.append(back, head, priceRow, chartCard, descCard, posCard,
    el('div', { class: 'sub', text: 'Cantidad a operar', style: 'font-size:11px;font-weight:600;margin-bottom:6px;' }),
    qtyInput, quick, actions);
}

// --- Operar por cantidad (preserva cálculos del MVP) ---
function operar(container, store, ticker, accion, qty) {
  const prices = getPrices(store);
  const asset = prices.find((a) => a.ticker === ticker);
  if (!asset) return;
  if (!Number.isFinite(qty) || qty < 1) { toast('Ingresá una cantidad válida.'); return; }

  if (accion === 'COMPRA') {
    const costo = asset.precio * qty;
    if (store.get('wallet.cash') < costo) { toast('Capital insuficiente.'); return; }
    store.update((s) => {
      s.wallet.cash -= costo;
      const pf = s.wallet.portfolio;
      if (!pf[ticker]) pf[ticker] = { cantidad: 0, precioCompra: 0 };
      const h = pf[ticker];
      const costoAnterior = h.cantidad * h.precioCompra;
      h.cantidad += qty;
      h.precioCompra = (costoAnterior + asset.precio * qty) / h.cantidad; // promedio ponderado
      if (asset.delta > 10) s.behavior.comprasEnAlza = (s.behavior.comprasEnAlza || 0) + 1;
      s.behavior.comprasTotales = (s.behavior.comprasTotales || 0) + qty;
      s.behavior.scoreRiesgo = (s.behavior.scoreRiesgo || 0) + asset.pesoRiesgo * qty;
    });
    toast(`Compraste ${qty} u. de ${ticker.split(' ')[0]}.`);
  } else {
    const pf = store.get('wallet.portfolio') || {};
    if (!pf[ticker] || pf[ticker].cantidad < qty) { toast('No tenés suficientes unidades.'); return; }
    store.update((s) => {
      s.wallet.cash += asset.precio * qty;
      s.wallet.portfolio[ticker].cantidad -= qty;
      if (asset.delta < -5) s.behavior.ventasEnBaja = (s.behavior.ventasEnBaja || 0) + 1;
    });
    toast(`Vendiste ${qty} u. de ${ticker.split(' ')[0]}.`);
  }
  renderDetail(container, store, ticker);
}
```

- [ ] **Step 2: Verificar parseo y tests**

Run: `node --check public/js/views/sim.js`
Expected: sin salida (OK).

Run: `npm test`
Expected: 20/20 verdes.

- [ ] **Step 3: Commit**

```bash
git add public/js/views/sim.js
git commit -m "feat(fase1): detalle de activo con grafico grande y compra/venta por monto"
```

---

## Task 7: Verificación integral del simulador

**Files:**
- (ninguno nuevo — verificación)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: confirmación de que la Fase 1 no rompió nada y de que el flujo nuevo es coherente.

- [ ] **Step 1: Suite completa de tests**

Run: `npm test`
Expected: 20/20 (10 base + 7 sim-engine + 3 chart), salida limpia.

- [ ] **Step 2: Checks estáticos**

Run: `node --check public/js/sim-engine.js public/js/chart.js public/js/views/sim.js public/js/store.js public/js/data/market.js`
Expected: sin salida (todos OK).

Confirmar (búsqueda en `public/js/views/sim.js`): no hay `alert(`/`confirm(` nativos; el violeta (`--violet`) no aparece en el simulador; los datos dinámicos no se inyectan por `innerHTML` salvo `container.innerHTML = ''` (limpieza). Reportar resultados.

- [ ] **Step 3: Recorrido manual (lo corre el humano)**

Levantar el server estático (`python -m http.server 8000 --directory public --bind 127.0.0.1`) y en el navegador, en `#/sim`:
- La pizarra muestra cada activo con su **mini-gráfico**.
- "Avanzar tiempo" cambia precios, agrega una noticia, y los **sparklines + el gráfico de rendimiento** se actualizan.
- **Recargar** la página conserva precios, historial, efectivo y cartera (ya no se resetean los precios).
- Tocar un activo abre el **detalle** con gráfico grande, descripción, y compra/venta; los botones **25/50/100%** completan la cantidad; comprar descuenta y muestra toast; vender repone; "Volver" regresa a la pizarra.
- El **rendimiento total %** y **vs SPY** se ven en la tarjeta superior.
- Las otras pantallas (quiz, liga, dashboard, inicio, chat) siguen andando.

- [ ] **Step 4: Commit (si hubo ajustes) o cierre**

Si los checks estáticos no requirieron cambios, no hay commit en este task. Si hubo algún ajuste menor, commitearlo:

```bash
git add -A && git commit -m "chore(fase1): ajustes de verificacion del simulador"
```

---

## Self-Review (cobertura del spec — Pilar 1)

- **Gráficos de precio (mini en lista + grande en detalle)** → Task 2 (chart.js) + Task 5 (sparkline en filas) + Task 6 (line chart en detalle). ✓
- **Persistencia de precios e historial entre recargas** (gap señalado en review de Fase 0) → Task 3 (store) + Task 5 (getPrices/seed + avanzarTiempo persiste). ✓
- **Compra/venta por monto con botones 25/50/100%** → Task 1 (quickAmountQty) + Task 6 (controles). ✓
- **Vista de detalle del activo (gráfico + descripción + posición + operar)** → Task 4 (desc) + Task 6. ✓
- **Avanzar tiempo guarda valor del portafolio en el tiempo → gráfico "tu rendimiento"** → Task 5 (valueHistory + renderLineChart). ✓
- **P&L claro: rendimiento total %, vs benchmark** → Task 1 (totalReturnPct, benchmarkReturnPct) + Task 5 (tarjeta de rendimiento). ✓
- **Instrumentos reales argentinos** → se conservan los de `market.js` (CEDEARs, ON). ✓
- **Cálculos preservados** → Task 6 (promedio ponderado, contadores) idénticos al MVP. ✓
- **Fuera de alcance (correcto):** XP por operar (Fase 3 social), IA en el sim (Fase 2). No se construyen acá.

**Nota de granularidad:** Tasks 5 y 6 reconstruyen `sim.js` con código completo en el plan (no por referencia), porque la vista cambia de fondo respecto del port de Fase 0. La lógica pura y la matemática de gráficos están cubiertas por tests; la vista se valida con `node --check` + recorrido manual (no hay framework de test de DOM en el proyecto, por decisión de Fase 0).
