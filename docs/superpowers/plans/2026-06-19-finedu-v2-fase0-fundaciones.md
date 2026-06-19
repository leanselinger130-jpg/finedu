# FINEDU v2 — Fase 0: Fundaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar el MVP de un único HTML a una app modular vanilla JS con el sistema visual nuevo (IBM Plex, navy+oro+violeta), un store local con persistencia, router con navegación inferior, y todas las pantallas actuales portadas sin regresión.

**Architecture:** Front estático servido por Netlify. Sin build, sin frameworks: HTML + CSS modular + ES Modules nativos en el navegador. Estado de la app centralizado en `store.js` (localStorage, modo invitado). Router por hash que muestra/oculta vistas. La lógica pura (store, router) se testea con el runner nativo de Node (`node:test`) inyectando dependencias; el código que toca el DOM se verifica manualmente.

**Tech Stack:** HTML5, CSS3 (custom properties), JavaScript ES Modules (sin transpilar), Node.js `node:test` para tests de lógica pura, Netlify CLI (`netlify dev`) para correr local.

## Global Constraints

- **Sin build step.** Nada de bundlers/transpiladores. El navegador carga ES Modules directo.
- **Sin dependencias de runtime.** `package.json` solo puede tener tooling de dev opcional; el front no importa librerías externas (las fuentes se cargan por `<link>` de Google Fonts).
- **Tipografía:** IBM Plex Sans única, con `font-variant-numeric: tabular-nums` en cifras. Sin monoespaciado.
- **Modo principal:** oscuro. Paleta exacta: fondo `#0F172A`, card `#222735`, borde `#334155`, texto `#F8FAFC`, atenuado `#94A3B8`, oro `#F59E0B`, violeta `#8B5CF6`, verde `#34D399`, rojo `#F87171`.
- **El violeta se usa solo para elementos de IA.** El oro marca dinero/acción primaria.
- **Sin `alert()` / `confirm()` nativos** en el código nuevo: se usan `toast()` y `confirmModal()` de `ui.js`.
- **No regresión:** al terminar la Fase 0, todas las funcionalidades del MVP actual siguen andando (simulador, quiz, dashboard, perfil, chat-stub), con el look nuevo.
- **Idioma:** toda la copy en español rioplatense (como el MVP actual).

---

## File Structure

```
package.json                 tooling de dev + script de test (type: module)
netlify.toml                 publish=public, functions=netlify/functions
public/
  index.html                 shell: <head> con fuentes, contenedor de vistas, <nav> inferior
  css/
    tokens.css               custom properties (colores, espaciado, radios, sombras)
    base.css                 reset, tipografía, body, utilidades (tabular-nums)
    components.css           botones, cards, pills, nav inferior, FAB IA, toast, modal
  js/
    app.js                   entry point: inicializa store, router, nav, monta vistas
    store.js                 estado central (localStorage), versión de esquema, get/set/update
    router.js                router por hash: resolveRoute() puro + wiring de DOM
    ui.js                    toast(), confirmModal(), helpers de creación de DOM (el, clear)
    views/
      home.js                vista Inicio (menú + acceso aliado al pie)
      sim.js                 vista Simulador (portada del MVP, reskin)
      quiz.js                vista Aprender/Quiz (portada del MVP, reskin)
      league.js              vista Liga (leaderboard sembrado del MVP, reskin)
      dashboard.js           vista Dashboard del broker (portada del MVP, reskin)
      profile.js             vista Perfil de riesgo IA (portada del MVP, reskin, sigue usando IA vieja por ahora)
      chat.js                FAB + panel de chat IA (stub actual: respuesta fija; IA real llega en Fase 2)
  js/data/
    market.js                catálogo de activos + pool de noticias (extraído del MVP)
    quizdata.js              preguntas del quiz (extraído del MVP)
tests/
  store.test.js              tests de store.js
  router.test.js             tests de resolveRoute()
docs/superpowers/plans/...   (este archivo)
```

**Decisión de límites:** cada vista es un módulo con una función `render(container, ctx)` que dibuja su pantalla dentro del contenedor que le pasa el router. Los datos (catálogo de mercado, preguntas) se separan en `js/data/` para no mezclar contenido con lógica. El `index.html` actual (848 líneas que hacen todo a la vez) se descompone en estas piezas.

---

## Task 1: Scaffolding del proyecto y tooling

**Files:**
- Create: `package.json`
- Create: `netlify.toml`
- Create: `public/index.html`
- Create: `public/js/app.js`
- Create: `public/css/tokens.css` (vacío por ahora)
- Create: `public/css/base.css` (vacío por ahora)
- Create: `public/css/components.css` (vacío por ahora)

**Interfaces:**
- Consumes: nada.
- Produces: estructura de carpetas y el shell `index.html` que carga `js/app.js` como módulo. `app.js` exporta nada; es el entry point.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "finedu",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "dev": "netlify dev"
  }
}
```

- [ ] **Step 2: Crear `netlify.toml`**

```toml
[build]
  publish = "public"
  functions = "netlify/functions"

[dev]
  publish = "public"
```

- [ ] **Step 3: Crear el shell `public/index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FINEDU · Finanzas Educativas</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/tokens.css" />
  <link rel="stylesheet" href="css/base.css" />
  <link rel="stylesheet" href="css/components.css" />
</head>
<body>
  <main id="app-view"><!-- el router monta acá la vista activa --></main>

  <button id="ai-fab" class="ai-fab" aria-label="Abrir Asesor IA">✦</button>

  <nav id="bottom-nav" class="bottom-nav" aria-label="Navegación principal">
    <a href="#/home" data-route="home" class="nav-item"><span class="nav-ic">🏠</span><span>Inicio</span></a>
    <a href="#/sim" data-route="sim" class="nav-item"><span class="nav-ic">📈</span><span>Simulador</span></a>
    <a href="#/quiz" data-route="quiz" class="nav-item"><span class="nav-ic">🧠</span><span>Aprender</span></a>
    <a href="#/league" data-route="league" class="nav-item"><span class="nav-ic">🏆</span><span>Liga</span></a>
  </nav>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Crear `public/js/app.js` con un placeholder mínimo**

```js
// Entry point. Se completa en Task 6 cuando existan store y router.
document.getElementById('app-view').textContent = 'FINEDU cargando…';
```

- [ ] **Step 5: Crear los tres CSS vacíos**

Crear `public/css/tokens.css`, `public/css/base.css`, `public/css/components.css` con un comentario de cabecera cada uno (ej. `/* tokens.css — custom properties */`).

- [ ] **Step 6: Verificar que abre**

Run: `npx netlify dev` (o abrir `public/index.html` directo en el navegador).
Expected: se ve el texto "FINEDU cargando…" y la barra inferior con 4 ítems (sin estilo todavía).

- [ ] **Step 7: Commit**

```bash
git add package.json netlify.toml public/
git commit -m "feat(fase0): scaffolding del proyecto y shell html"
```

---

## Task 2: Sistema visual (tokens + base + componentes)

**Files:**
- Modify: `public/css/tokens.css`
- Modify: `public/css/base.css`
- Modify: `public/css/components.css`

**Interfaces:**
- Consumes: nada.
- Produces: clases CSS reutilizables que las vistas usarán: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ai`, `.card`, `.pill`, `.pill-up`, `.pill-down`, `.bottom-nav`, `.nav-item.active`, `.ai-fab`, `.toast`, `.modal-backdrop`, `.skeleton`. Variables CSS: `--navy --card --border --fg --sub --gold --violet --green --red --space-* --radius-* --shadow`.

- [ ] **Step 1: Escribir `public/css/tokens.css`**

```css
/* tokens.css — custom properties */
:root {
  --navy: #0F172A;
  --card: #222735;
  --card-2: #1b2030;
  --border: #334155;
  --fg: #F8FAFC;
  --sub: #94A3B8;
  --gold: #F59E0B;
  --gold-2: #FBBF24;
  --violet: #8B5CF6;
  --violet-soft: rgba(139,92,246,.18);
  --violet-border: rgba(139,92,246,.45);
  --green: #34D399;
  --red: #F87171;

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --radius-sm: 9px; --radius-md: 14px; --radius-lg: 18px; --radius-xl: 24px;
  --shadow: 0 20px 50px rgba(0,0,0,.45);
}
```

- [ ] **Step 2: Escribir `public/css/base.css`**

```css
/* base.css — reset, tipografía, layout base */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: var(--navy);
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
  padding-bottom: 84px; /* deja lugar para la nav inferior fija */
}
#app-view { max-width: 480px; margin: 0 auto; padding: 20px 16px; min-height: 100dvh; }
h1, h2, h3 { font-weight: 700; letter-spacing: -.3px; margin-top: 0; }
.tnum { font-variant-numeric: tabular-nums; }
.sub { color: var(--sub); }
.center { text-align: center; }
a { color: inherit; text-decoration: none; }
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
```

- [ ] **Step 3: Escribir `public/css/components.css`**

```css
/* components.css — botones, cards, nav, fab, toast, modal */
.btn {
  display: flex; align-items: center; gap: 11px; width: 100%;
  border: none; border-radius: var(--radius-md); padding: 14px 16px;
  font-family: inherit; font-weight: 600; font-size: 14px; cursor: pointer;
  margin-bottom: 9px; transition: transform .12s ease, filter .12s ease;
}
.btn:active { transform: translateY(2px); }
.btn small { display: block; font-weight: 400; font-size: 10.5px; margin-top: 1px; }
.btn-primary { background: var(--gold); color: #1a1205; }
.btn-primary small { color: #5a4410; }
.btn-secondary { background: var(--card); border: 1px solid var(--border); color: var(--fg); }
.btn-secondary small { color: var(--sub); }
.btn-ai { background: var(--card); border: 1px solid var(--violet-border); color: var(--fg); }
.btn-ai small { color: #a99bd6; }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--sub); }

.card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 14px; }

.pill { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: var(--radius-sm); }
.pill-up { background: rgba(52,211,153,.14); color: var(--green); }
.pill-down { background: rgba(248,113,113,.14); color: var(--red); }
.pill-gold { background: rgba(245,158,11,.16); color: var(--gold-2); }

.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  display: flex; justify-content: space-around;
  background: var(--card-2); border-top: 1px solid var(--border);
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  max-width: 480px; margin: 0 auto;
}
.nav-item { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; color: var(--sub); min-width: 56px; padding: 4px 0; }
.nav-item .nav-ic { font-size: 18px; }
.nav-item.active { color: var(--gold); }

.ai-fab {
  position: fixed; right: 16px; bottom: 84px; z-index: 41;
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--violet); color: #fff; border: none; font-size: 22px; cursor: pointer;
  box-shadow: 0 6px 18px rgba(139,92,246,.45);
}

.toast {
  position: fixed; left: 50%; bottom: 100px; transform: translateX(-50%);
  background: var(--card); border: 1px solid var(--border); color: var(--fg);
  padding: 12px 18px; border-radius: var(--radius-md); font-size: 13px; z-index: 60;
  box-shadow: var(--shadow); max-width: 90%;
}

.modal-backdrop {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 22px; max-width: 360px; width: 100%;
}
.modal-actions { display: flex; gap: 10px; margin-top: 18px; }
.modal-actions .btn { margin: 0; justify-content: center; }

.skeleton { background: linear-gradient(90deg, #2a3147 25%, #353d54 50%, #2a3147 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; border-radius: var(--radius-sm); }
@keyframes shimmer { to { background-position: -200% 0; } }
```

- [ ] **Step 4: Verificar visualmente**

Run: abrir `public/index.html` en el navegador.
Expected: fondo navy, fuente IBM Plex, barra inferior con fondo oscuro y los 4 ítems en gris, FAB violeta abajo a la derecha.

- [ ] **Step 5: Commit**

```bash
git add public/css/
git commit -m "feat(fase0): sistema visual (tokens, base, componentes)"
```

---

## Task 3: `store.js` — estado central con persistencia (TDD)

**Files:**
- Create: `public/js/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `createStore(storage)` → objeto store. `storage` es un objeto con `getItem(k)`/`setItem(k,v)` (default `localStorage`). Inyectable para tests.
  - `store.getState()` → objeto de estado completo (copia).
  - `store.get(path)` → valor por path con puntos, ej. `store.get('wallet.cash')`.
  - `store.set(path, value)` → setea y persiste.
  - `store.update(fn)` → `fn(state)` muta una copia, se persiste y se devuelve.
  - `store.reset()` → vuelve al estado por defecto y persiste.
  - `DEFAULT_STATE` (export) y `SCHEMA_VERSION` (export, número).
  - Migración: si el estado guardado tiene `schemaVersion` distinto, se hace merge sobre `DEFAULT_STATE`.

- [ ] **Step 1: Escribir el test que falla**

```js
// tests/store.test.js
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
  const s = createStore(mockStorage());
  s.update((st) => { st.progress.xp += 50; });
  assert.equal(s.get('progress.xp'), 50);
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
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm test`
Expected: FALLA con error de import (no existe `store.js` o no exporta nada).

- [ ] **Step 3: Implementar `public/js/store.js`**

```js
// store.js — estado central con persistencia en localStorage
export const SCHEMA_VERSION = 1;
const KEY = 'finedu-state';

export const DEFAULT_STATE = {
  schemaVersion: SCHEMA_VERSION,
  user: { email: null, createdAt: null },
  wallet: { cash: 100000, portfolio: {}, valueHistory: [] },
  market: { turn: 0, currentNews: null },
  progress: { xp: 0, streak: 0, lastActiveDate: null, quizLevelsDone: [], achievements: [] },
  behavior: { comprasEnAlza: 0, ventasEnBaja: 0, turnos: 0 },
  metrics: { brokerSim: 0, brokerQuiz: 0, mails: 0, shared: 0, ia: 0, hum: 0 },
  settings: { theme: 'dark', brokerSkin: null },
};

function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(override || {})) {
    const bv = base ? base[k] : undefined;
    const ov = override[k];
    out[k] = (ov && typeof ov === 'object' && !Array.isArray(ov) && bv && typeof bv === 'object')
      ? deepMerge(bv, ov) : ov;
  }
  return out;
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setByPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

export function createStore(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  let state;
  const raw = storage ? storage.getItem(KEY) : null;
  if (raw) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
    state = parsed ? deepMerge(structuredClone(DEFAULT_STATE), parsed) : structuredClone(DEFAULT_STATE);
    state.schemaVersion = SCHEMA_VERSION;
  } else {
    state = structuredClone(DEFAULT_STATE);
    if (!state.user.createdAt) state.user.createdAt = new Date().toISOString();
  }
  function persist() { if (storage) storage.setItem(KEY, JSON.stringify(state)); }
  persist();

  return {
    getState: () => structuredClone(state),
    get: (path) => getByPath(state, path),
    set: (path, value) => { setByPath(state, path, value); persist(); },
    update: (fn) => { fn(state); persist(); return structuredClone(state); },
    reset: () => { state = structuredClone(DEFAULT_STATE); persist(); },
  };
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test`
Expected: PASAN los 6 tests de `store.test.js`.

- [ ] **Step 5: Commit**

```bash
git add public/js/store.js tests/store.test.js
git commit -m "feat(fase0): store central con persistencia y migracion de esquema"
```

---

## Task 4: `router.js` — navegación por hash (TDD para la parte pura)

**Files:**
- Create: `public/js/router.js`
- Test: `tests/router.test.js`

**Interfaces:**
- Consumes: nada (las vistas se registran desde `app.js`).
- Produces:
  - `resolveRoute(hash, routeNames, fallback)` → string: el nombre de ruta válido a partir de un hash (`'#/sim'` → `'sim'`); si no matchea, devuelve `fallback`.
  - `createRouter({ container, routes, onChange })` → `{ start(), navigate(name) }`.
    - `routes` es `{ name: renderFn }` donde `renderFn(container, ctx)` dibuja la vista.
    - `start()` lee el hash actual, resuelve y renderiza; escucha `hashchange`.
    - `navigate(name)` cambia `location.hash`.
    - `onChange(name)` se llama tras cada render (lo usa `app.js` para marcar el ítem activo de la nav).

- [ ] **Step 1: Escribir el test de la parte pura**

```js
// tests/router.test.js
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
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existe `resolveRoute`).

- [ ] **Step 3: Implementar `public/js/router.js`**

```js
// router.js — navegación por hash
export function resolveRoute(hash, routeNames, fallback) {
  const clean = String(hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];
  return routeNames.includes(clean) ? clean : fallback;
}

export function createRouter({ container, routes, onChange }) {
  const names = Object.keys(routes);
  const fallback = names[0];
  function renderCurrent() {
    const name = resolveRoute(location.hash, names, fallback);
    container.innerHTML = '';
    routes[name](container, {});
    if (onChange) onChange(name);
  }
  return {
    start() { window.addEventListener('hashchange', renderCurrent); renderCurrent(); },
    navigate(name) { location.hash = `#/${name}`; },
  };
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test`
Expected: PASAN los 4 tests de `router.test.js` (y siguen pasando los de store).

- [ ] **Step 5: Commit**

```bash
git add public/js/router.js tests/router.test.js
git commit -m "feat(fase0): router por hash con resolucion de rutas testeada"
```

---

## Task 5: `ui.js` — toast, modal de confirmación y helpers de DOM

**Files:**
- Create: `public/js/ui.js`

**Interfaces:**
- Consumes: clases CSS de `components.css` (`.toast`, `.modal-backdrop`, `.modal`, `.btn`).
- Produces:
  - `el(tag, props, children)` → crea un elemento DOM. `props` puede tener `class`, `text`, `html`, `onclick`, `style` y atributos. `children` array de nodos o strings.
  - `clear(node)` → vacía un nodo.
  - `toast(msg, ms = 2600)` → muestra un toast que se auto-cierra.
  - `confirmModal({ title, body, okText = 'Confirmar', cancelText = 'Cancelar' })` → `Promise<boolean>`.

- [ ] **Step 1: Implementar `public/js/ui.js`**

```js
// ui.js — helpers de DOM, toast y modal de confirmación (reemplazan alert/confirm)
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style') node.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

export function toast(msg, ms = 2600) {
  const t = el('div', { class: 'toast', role: 'status', text: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export function confirmModal({ title, body, okText = 'Confirmar', cancelText = 'Cancelar' }) {
  return new Promise((resolve) => {
    const close = (val) => { backdrop.remove(); resolve(val); };
    const backdrop = el('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === backdrop) close(false); } }, [
      el('div', { class: 'modal' }, [
        el('h3', { text: title }),
        el('p', { class: 'sub', text: body, style: 'font-size:13px;line-height:1.5;' }),
        el('div', { class: 'modal-actions' }, [
          el('button', { class: 'btn btn-ghost', text: cancelText, onclick: () => close(false) }),
          el('button', { class: 'btn btn-primary', text: okText, onclick: () => close(true) }),
        ]),
      ]),
    ]);
    document.body.append(backdrop);
  });
}
```

- [ ] **Step 2: Verificación manual rápida**

En `public/js/app.js` (temporal), importar y probar: `import { toast } from './ui.js'; toast('Hola FINEDU');`. Abrir el navegador y confirmar que aparece y desaparece el toast. Luego revertir esa línea de prueba.

Expected: el toast aparece centrado abajo y se va solo. (No hay test unitario: es código de DOM puro; se valida en el navegador.)

- [ ] **Step 3: Commit**

```bash
git add public/js/ui.js
git commit -m "feat(fase0): ui.js con toast, confirmModal y helpers de DOM"
```

---

## Task 6: Datos del MVP extraídos (mercado + quiz)

**Files:**
- Create: `public/js/data/market.js`
- Create: `public/js/data/quizdata.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `market.js`: `export const ASSETS` (array de `{ ticker, tipo, precio, delta, pesoRiesgo }`) y `export const NEWS` (array de `{ id, text, impacto }`). Copiar los valores de `app-tisi.html` líneas 364–388 (`mercadoActivos` y `poolNoticias`) tal cual.
  - `quizdata.js`: `export const QUIZ` (objeto con `principiante`, `intermedio`, `ia_generado`, cada uno array de `{ q, options, correct, explain }`). Copiar de `app-tisi.html` líneas 390–427 (`quizData`) tal cual.

- [ ] **Step 1: Crear `public/js/data/market.js`**

Copiar el array `mercadoActivos` y `poolNoticias` del archivo `app-tisi.html` (líneas 364–388) y exportarlos como `ASSETS` y `NEWS` respectivamente. Mantener exactamente los mismos tickers, precios y `impacto`.

- [ ] **Step 2: Crear `public/js/data/quizdata.js`**

Copiar el objeto `quizData` del archivo `app-tisi.html` (líneas 390–427) y exportarlo como `QUIZ`. Mantener exactamente las mismas preguntas, opciones, índices `correct` y `explain`.

- [ ] **Step 3: Verificar que importan sin error**

Run: `node -e "import('./public/js/data/market.js').then(m=>console.log(m.ASSETS.length, m.NEWS.length))"`
Expected: imprime `7 5`.

Run: `node -e "import('./public/js/data/quizdata.js').then(m=>console.log(Object.keys(m.QUIZ)))"`
Expected: imprime `[ 'principiante', 'intermedio', 'ia_generado' ]`.

- [ ] **Step 4: Commit**

```bash
git add public/js/data/
git commit -m "feat(fase0): extraer datos de mercado y quiz a modulos de datos"
```

---

## Task 7: Wiring del shell — `app.js` con store, router y nav activa

**Files:**
- Modify: `public/js/app.js`
- Create: `public/js/views/home.js` (versión mínima temporal; se completa en Task 8)

**Interfaces:**
- Consumes: `createStore` (store.js), `createRouter` (router.js), `toast` (ui.js).
- Produces: una instancia global de store pasada a las vistas vía el contexto del router. `app.js` registra las rutas `home, sim, quiz, league, dashboard, profile` y mantiene el `.active` de la nav inferior sincronizado con la ruta.

- [ ] **Step 1: Crear `public/js/views/home.js` temporal**

```js
import { el } from '../ui.js';
export function renderHome(container) {
  container.append(el('h1', { text: 'FINEDU' }), el('p', { class: 'sub', text: 'Inicio (placeholder)' }));
}
```

- [ ] **Step 2: Escribir `public/js/app.js`**

```js
import { createStore } from './store.js';
import { createRouter } from './router.js';
import { renderHome } from './views/home.js';

const store = createStore();
const container = document.getElementById('app-view');

// Placeholders temporales para las rutas que se completan en tasks siguientes.
const placeholder = (name) => (c) => { c.innerHTML = `<h2>${name}</h2><p class="sub">En construcción</p>`; };

const routes = {
  home: (c) => renderHome(c, { store }),
  sim: placeholder('Simulador'),
  quiz: placeholder('Aprender'),
  league: placeholder('Liga'),
  dashboard: placeholder('Dashboard del broker'),
  profile: placeholder('Perfil de riesgo IA'),
};

function setActiveNav(name) {
  document.querySelectorAll('.nav-item').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-route') === name);
  });
}

const router = createRouter({ container, routes, onChange: setActiveNav });
router.start();

document.getElementById('ai-fab').addEventListener('click', () => { location.hash = '#/chat'; });
// El panel de chat se monta en Task 13; por ahora el FAB navega a una ruta inexistente => cae a home.
```

- [ ] **Step 3: Verificación manual**

Run: abrir el navegador, tocar cada ítem de la barra inferior.
Expected: cambia la vista, el ítem tocado queda en oro (`.active`), las rutas sin completar muestran "En construcción".

- [ ] **Step 4: Commit**

```bash
git add public/js/app.js public/js/views/home.js
git commit -m "feat(fase0): wiring de store + router + nav activa"
```

---

## Task 8: Vista Inicio (Home) portada y reskineada

**Files:**
- Modify: `public/js/views/home.js`

**Interfaces:**
- Consumes: `el` (ui.js), el `store` vía contexto.
- Produces: `renderHome(container, { store })` que dibuja el Inicio del MVP con el look nuevo: encabezado de marca, capital virtual, botones a Simulador / Aprender / Asesor IA, captura de mail, compartir, y el acceso discreto "¿Sos un broker?" al pie que navega a `#/dashboard`.

- [ ] **Step 1: Implementar `renderHome`**

Portar el contenido del `#home` del MVP (`app-tisi.html` líneas 130–153) al look nuevo. Reemplazar los `onclick="nav('sim')"` por navegación a hash (`location.hash = '#/sim'`). Reemplazar `registrarMail()`/`compartirWhatsApp()` por handlers que actualizan `store` y muestran `toast()`.

```js
import { el, toast } from '../ui.js';

export function renderHome(container, { store }) {
  const cash = store.get('wallet.cash');
  const go = (r) => () => { location.hash = `#/${r}`; };

  const head = el('div', {}, [
    el('h1', { html: 'FINEDU<span style="color:var(--gold)">.</span>', style: 'font-size:26px;' }),
    el('p', { class: 'sub', text: 'Practicá, aprendé y operá con confianza.', style: 'font-size:13px;margin-top:4px;' }),
  ]);

  const balance = el('div', { class: 'card' }, [
    el('div', { class: 'sub', text: 'Capital virtual', style: 'font-size:11px;font-weight:500;' }),
    el('div', { class: 'tnum', text: '$' + cash.toLocaleString('es-AR'), style: 'font-size:30px;font-weight:700;color:var(--gold);margin-top:3px;' }),
  ]);

  const actions = el('div', {}, [
    el('button', { class: 'btn btn-primary', onclick: go('sim') }, [el('span', { text: '📈' }), el('span', { html: 'Simulador<small>Operá sin riesgo en tiempo real</small>' })]),
    el('button', { class: 'btn btn-secondary', onclick: go('quiz') }, [el('span', { text: '🧠' }), el('span', { html: 'Aprender<small>Micro-lecciones tipo trivia</small>' })]),
    el('button', { class: 'btn btn-ai', onclick: () => { location.hash = '#/chat'; } }, [el('span', { text: '✦' }), el('span', { html: 'Asesor IA<small>Tu maestro y garante 24/7</small>' })]),
  ]);

  const mailInput = el('input', { type: 'email', placeholder: 'Tu email para enterarte del lanzamiento', class: 'finput', style: 'width:100%;padding:12px;border-radius:14px;border:1px solid var(--border);background:var(--card);color:var(--fg);margin-bottom:9px;' });
  const mailBtn = el('button', { class: 'btn btn-ghost', text: 'Avisarme del lanzamiento', onclick: () => {
    if (!mailInput.value.includes('@')) { toast('Ingresá un email válido'); return; }
    store.update((s) => { s.metrics.mails += 1; });
    mailInput.value = '';
    toast('¡Listo! Te avisamos. 📬');
  } });

  const brokerLink = el('a', { href: '#/dashboard', class: 'sub center', style: 'display:block;font-size:12px;margin-top:24px;text-decoration:underline;', text: '¿Sos un broker? → Panel de aliado' });

  container.append(head, balance, actions, el('hr', { style: 'border:0;border-top:1px solid var(--border);margin:18px 0;' }), mailInput, mailBtn, brokerLink);
}
```

- [ ] **Step 2: Verificación manual**

Run: abrir el navegador en `#/home`.
Expected: se ve marca, capital en oro, los 3 botones (primario oro, secundario, IA con borde violeta), input de mail (cargar uno inválido → toast de error; uno válido → toast de éxito), y el link "¿Sos un broker?" al pie. Tocar los botones navega.

- [ ] **Step 3: Commit**

```bash
git add public/js/views/home.js
git commit -m "feat(fase0): vista Inicio portada al sistema visual nuevo"
```

---

## Task 9: Vista Simulador portada (comportamiento del MVP, reskin)

**Files:**
- Create: `public/js/views/sim.js`
- Modify: `public/js/app.js` (registrar la ruta real)

**Interfaces:**
- Consumes: `el`, `toast`, `confirmModal` (ui.js); `ASSETS`, `NEWS` (data/market.js); `store`.
- Produces: `renderSim(container, { store })` que replica la funcionalidad del simulador del MVP (pizarra de activos, comprar/vender de a 1, avanzar tiempo con noticias, tenencias y P&L), guardando estado en `store`. **Nota:** la mejora a gráficos + montos llega en la Fase 1; acá solo se porta y reskinea para no regresar.

- [ ] **Step 1: Implementar `renderSim`**

Portar las funciones `renderSimulador`, `ejecutarAccionSim` y `avanzarEscenarioMacro` del MVP (`app-tisi.html` líneas 442–545) a un módulo que: lee/escribe `store.get('wallet.cash')`, `store.get('wallet.portfolio')`, `store.get('behavior.*')` y `store.get('market.turn')`; usa `ASSETS`/`NEWS` importados; reemplaza `alert("Capital insuficiente.")` por `toast('Capital insuficiente.')`. Mantener la tabla con clases `.card`/`.pill-up`/`.pill-down`. Los botones de compra/venta usan `.btn` chicos.

Estructura mínima de la firma y el guardado:

```js
import { el, toast } from '../ui.js';
import { ASSETS, NEWS } from '../data/market.js';

export function renderSim(container, { store }) {
  // Estado de mercado en memoria de la vista, inicializado desde ASSETS;
  // turno y conducta persisten en store. (Portar lógica del MVP 442–545.)
  // ... construir: cabecera con efectivo + valor de portafolio, cable de noticias,
  //     botón "Avanzar tiempo", tabla de activos (comprar/vender), tenencias con rendimiento.
  // ejecutarAccion(ticker, 'COMPRA'|'VENTA') actualiza store y vuelve a renderizar.
}
```

(El detalle de la lógica es el del MVP; mantener idénticos los cálculos de `precioCompra` promedio, rendimiento `%` y los contadores `comprasEnAlza`/`ventasEnBaja`.)

- [ ] **Step 2: Registrar la ruta en `app.js`**

Reemplazar `sim: placeholder('Simulador')` por:

```js
import { renderSim } from './views/sim.js';
// ...
sim: (c) => renderSim(c, { store }),
```

- [ ] **Step 3: Verificación manual**

Run: abrir `#/sim`.
Expected: pizarra con los 7 activos, comprar descuenta efectivo y agrega a tenencias, vender repone, "Avanzar tiempo" cambia precios y muestra una noticia. Sin capital suficiente → toast (no `alert`). Recargar la página conserva efectivo y cartera (gracias al store).

- [ ] **Step 4: Commit**

```bash
git add public/js/views/sim.js public/js/app.js
git commit -m "feat(fase0): portar simulador del MVP a modulo con store"
```

---

## Task 10: Vista Aprender/Quiz portada (reskin)

**Files:**
- Create: `public/js/views/quiz.js`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `el`, `toast`, `confirmModal`; `QUIZ` (data/quizdata.js); `store`.
- Produces: `renderQuiz(container, { store })` que muestra la home del quiz (3 niveles) y corre una lección: pregunta, opciones seleccionables, comprobar, feedback integrado (sin `alert`), vidas, y suma XP a `store.progress.xp` al acertar. Marca el nivel completado en `store.progress.quizLevelsDone`.

- [ ] **Step 1: Implementar `renderQuiz`**

Portar `startQuiz`, `showQuestion`, `checkSelectedAnswer`, `nextQuestion` del MVP (`app-tisi.html` líneas 640–722) a un módulo. Cambios obligatorios:
- El "te quedaste sin vidas" y "completaste el nivel" usan `confirmModal`/`toast`, no `alert`.
- Al acertar: `store.update((s) => { s.progress.xp += 50; })`.
- Al terminar un nivel: agregar el nivel a `store.get('progress.quizLevelsDone')` si no está.
- Usar las clases `.btn`, `.card` y los colores de feedback con verde/rojo de tokens.

- [ ] **Step 2: Registrar la ruta**

```js
import { renderQuiz } from './views/quiz.js';
// ...
quiz: (c) => renderQuiz(c, { store }),
```

- [ ] **Step 3: Verificación manual**

Run: abrir `#/quiz`, entrar a "Principiante", responder.
Expected: opción correcta → feedback verde y suma XP; incorrecta → feedback rojo y resta vida; completar nivel → modal/toast de éxito; el XP persiste al recargar.

- [ ] **Step 4: Commit**

```bash
git add public/js/views/quiz.js public/js/app.js
git commit -m "feat(fase0): portar quiz del MVP con feedback integrado y XP en store"
```

---

## Task 11: Vista Liga (leaderboard sembrado) portada

**Files:**
- Create: `public/js/views/league.js`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `el`; `store`.
- Produces: `renderLeague(container, { store })` que muestra la tabla de liga con rivales sembrados + el usuario, ordenada por XP. El XP del usuario sale de `store.get('progress.xp')`. (La liga real con Supabase llega en la Fase 3.)

- [ ] **Step 1: Implementar `renderLeague`**

Portar `renderLeaderboard` del MVP (`app-tisi.html` líneas 724–742). Los rivales sembrados se definen como constante local `RIVALS = [{nombre:'Santi_Inversiones', xp:250}, {nombre:'Flor.Finanzas', xp:180}]`. El usuario se arma con `{ nombre: 'Vos', xp: store.get('progress.xp'), isUser: true }`. Ordenar por XP desc y resaltar la fila del usuario.

- [ ] **Step 2: Registrar la ruta**

```js
import { renderLeague } from './views/league.js';
// ...
league: (c) => renderLeague(c, { store }),
```

- [ ] **Step 3: Verificación manual**

Run: hacer un quiz para sumar XP, abrir `#/league`.
Expected: tabla ordenada por XP; la fila "Vos" resaltada y reflejando el XP ganado.

- [ ] **Step 4: Commit**

```bash
git add public/js/views/league.js public/js/app.js
git commit -m "feat(fase0): portar liga con leaderboard sembrado"
```

---

## Task 12: Vista Dashboard del broker portada

**Files:**
- Create: `public/js/views/dashboard.js`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `el`; `store`.
- Produces: `renderDashboard(container, { store })` que muestra las métricas de `store.get('metrics')` (clicks broker sim/quiz, mails, compartidos, IA vs humano) con el look nuevo. Incluye un encabezado de "acceso aliado" simple (logo + título) arriba para la narrativa B2B.

- [ ] **Step 1: Implementar `renderDashboard`**

Portar la vista `#dash` y `updateDash` del MVP (`app-tisi.html` líneas 300–335 y 747–760). Las tarjetas leen de `store.get('metrics')`. La barra IA vs Humano calcula el % como en el MVP. Agregar arriba un bloque "Panel de aliado · (broker demo)".

- [ ] **Step 2: Registrar la ruta**

```js
import { renderDashboard } from './views/dashboard.js';
// ...
dashboard: (c) => renderDashboard(c, { store }),
```

- [ ] **Step 3: Verificación manual**

Run: cargar un mail en Inicio, abrir `#/dashboard`.
Expected: la métrica "Mails capturados" refleja el valor; el panel se ve con el estilo nuevo y el encabezado de aliado.

- [ ] **Step 4: Commit**

```bash
git add public/js/views/dashboard.js public/js/app.js
git commit -m "feat(fase0): portar dashboard del broker con metricas del store"
```

---

## Task 13: Chat IA (stub) + FAB

**Files:**
- Create: `public/js/views/chat.js`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `el`; `store`.
- Produces: `mountChat({ store })` que crea un panel flotante de chat (oculto por defecto) y lo togglea. Por ahora responde con el mensaje fijo del MVP (la IA real llega en la Fase 2). El FAB ✦ abre/cierra el panel en vez de navegar.

- [ ] **Step 1: Implementar `public/js/views/chat.js`**

```js
import { el } from '../ui.js';

const STUB_REPLY = 'En esta versión el asistente todavía es de muestra. En la próxima entrega va a poder responderte de verdad sobre tu cartera, balances y activos.';

export function mountChat() {
  const box = el('div', { id: 'chat-box', style: 'display:flex;flex-direction:column;gap:8px;' }, [
    el('div', { class: 'card', style: 'margin:0;', text: '¡Hola! Soy tu Asesor IA. (Versión de muestra por ahora.)' }),
  ]);
  const input = el('input', { type: 'text', placeholder: 'Escribí tu consulta…', style: 'flex:1;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--navy);color:var(--fg);' });
  const send = () => {
    const t = input.value.trim(); if (!t) return;
    box.append(el('div', { class: 'card', style: 'margin:0;align-self:flex-end;background:var(--violet-soft);border-color:var(--violet-border);', text: t }));
    input.value = '';
    setTimeout(() => box.append(el('div', { class: 'card', style: 'margin:0;', text: STUB_REPLY })), 500);
    box.scrollTop = box.scrollHeight;
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  const panel = el('div', { id: 'ai-panel', style: 'display:none;position:fixed;right:16px;bottom:150px;z-index:42;width:min(360px,92vw);height:440px;background:var(--card-2);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow);flex-direction:column;overflow:hidden;' }, [
    el('div', { style: 'background:var(--violet);color:#fff;padding:12px 14px;font-weight:600;', text: '✦ Asesor IA' }),
    el('div', { style: 'flex:1;overflow-y:auto;padding:12px;', }, [box]),
    el('div', { style: 'display:flex;gap:6px;padding:10px;border-top:1px solid var(--border);' }, [input, el('button', { class: 'btn btn-ai', style: 'width:auto;margin:0;padding:0 14px;', text: '➤', onclick: send })]),
  ]);
  document.body.append(panel);
  return {
    toggle() {
      const open = panel.style.display === 'flex';
      panel.style.display = open ? 'none' : 'flex';
    },
  };
}
```

- [ ] **Step 2: Conectar el FAB en `app.js`**

Reemplazar el listener temporal del FAB por:

```js
import { mountChat } from './views/chat.js';
// ...
const chat = mountChat({ store });
document.getElementById('ai-fab').addEventListener('click', () => chat.toggle());
```

- [ ] **Step 3: Verificación manual**

Run: tocar el FAB ✦ en cualquier pantalla.
Expected: abre el panel de chat; escribir y enviar muestra el mensaje del usuario (violeta) y luego la respuesta stub; tocar el FAB de nuevo lo cierra.

- [ ] **Step 4: Commit**

```bash
git add public/js/views/chat.js public/js/app.js
git commit -m "feat(fase0): panel de chat IA stub conectado al FAB"
```

---

## Task 14: Verificación integral y baja del MVP viejo

**Files:**
- Delete: `app-tisi.html` (el MVP monolítico, ya portado)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: el repo queda con la app modular como única fuente; el monolito viejo se elimina.

- [ ] **Step 1: Correr toda la suite de tests**

Run: `npm test`
Expected: PASAN todos los tests (store + router).

- [ ] **Step 2: Recorrido manual completo (checklist)**

Abrir `netlify dev` y verificar, sin errores en consola:
- Nav inferior: las 4 pestañas cambian de vista y marcan el activo en oro.
- Inicio: capital, botones, captura de mail (toast), link a panel de aliado.
- Simulador: comprar/vender, avanzar tiempo, P&L; persiste al recargar.
- Aprender: una lección completa suma XP; feedback integrado; sin `alert`.
- Liga: refleja el XP del usuario.
- Dashboard: refleja métricas (mail capturado).
- FAB IA: abre/cierra el chat stub.
- No quedan llamadas a `alert(`/`confirm(` en `public/js/` (buscar para confirmar).

- [ ] **Step 3: Confirmar que no quedó la API key vieja**

Run (buscar la key hardcodeada): confirmar que `public/` no contiene `AQ.Ab8RN6` ni claves de Gemini. (La IA real y su key llegan en la Fase 2 como env var.)
Expected: sin coincidencias.

- [ ] **Step 4: Eliminar el MVP monolítico**

```bash
git rm app-tisi.html
```

- [ ] **Step 5: Commit final de la fase**

```bash
git add -A
git commit -m "chore(fase0): eliminar MVP monolitico ya portado; cierre de fundaciones"
```

---

## Self-Review (cobertura del spec)

- **Identidad visual** → Task 2 (tokens/base/components con la paleta y la fuente exactas). ✓
- **Arquitectura vanilla modular sin build** → Tasks 1, 3–13 (módulos ES, sin bundler). ✓
- **Store local + versión de esquema + arregla pérdida de XP/métricas** → Task 3. ✓
- **Router + nav inferior + acceso discreto al dashboard** → Tasks 4, 7, 8 (link al pie), 12. ✓
- **Reemplazo de alert/confirm** → Task 5 (ui.js) usado en Tasks 8–10, verificado en Task 14. ✓
- **No regresión de funcionalidades** → Tasks 8–13 portan home/sim/quiz/league/dashboard/chat. ✓
- **Seguridad: sacar la key vieja** → Task 14 Step 3–4 (la app nueva no la incluye). ✓
- **Fuera de alcance de Fase 0 (correcto):** gráficos del sim (Fase 1), IA real (Fase 2), Supabase/auth/liga real/desafíos (Fase 3), marca blanca/onboarding/métricas reales del dashboard (Fase 4). Cada una tendrá su propio plan.

**Nota de granularidad:** las Tasks 9–12 portan lógica existente del MVP; el plan indica las líneas fuente exactas y los cambios obligatorios (store + reemplazo de alert) en vez de repetir verbatim ~250 líneas ya presentes en el repo. Esto es intencional (DRY): el código fuente está disponible en `app-tisi.html` hasta la Task 14.
