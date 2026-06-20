# FINEDU v2 — Fase 4: B2B + viralidad local + pulido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar FINEDU v2 vendible y demo-listo: demo de marca blanca (re-skin por broker), dashboard del broker más visual, viralidad local sin backend (racha, logros, desafío por link) y pulido final (onboarding, animaciones, limpieza).

**Architecture:** Todo sigue vanilla JS modular sin build, sobre las Fases 0-2 ya mergeadas. La lógica nueva testeable (presets de broker, racha, logros, encode/decode del link de desafío) va en módulos puros con `node:test`; el theming, las vistas y el onboarding tocan el DOM y se validan a mano. La decisión de producto de esta fase: **no se construyen cuentas propias** (la identidad la provee el SSO del broker en producción); la persistencia sigue en `store` (localStorage). Supabase queda como roadmap.

**Tech Stack:** HTML/CSS (custom properties para el theming), JavaScript ES Modules, `node:test`, el `store`/`ui`/`chart` ya existentes.

## Global Constraints

- **Sin build step. Sin dependencias de runtime.** ES Modules nativos.
- **Tipografía IBM Plex Sans, cifras `.tnum`, colores por variables CSS** (no hex crudo en JS de vistas). Español rioplatense.
- **Modo oscuro primario.** El violeta es solo para IA. El theming de marca blanca cambia el **acento de marca** (`--brand`), no el violeta de IA.
- **Sin `alert()`/`confirm()` nativos** → `toast()`/`confirmModal()`. DOM con `el()`; datos dinámicos por `text:` (no innerHTML salvo `container.innerHTML=''`/`clear()`).
- **No backend nuevo.** La viralidad funciona client-side (el desafío va en el querystring del link). No se agrega Supabase.
- **No romper lo existente:** simulador, quiz, liga, dashboard, inicio, chat, perfil y anti-fraude siguen andando; los 44 tests actuales siguen verdes; la IA (Fase 2) intacta.
- **Persistencia:** todo estado nuevo va en `store` con sus claves ya presentes (`progress.streak`, `progress.lastActiveDate`, `progress.achievements`, `settings.brokerSkin`) o claves nuevas additivas en `DEFAULT_STATE` (migración por deepMerge).

---

## File Structure

```
public/js/
  data/brokers.js     NUEVO — presets de marca blanca (default, cocos, balanz) (puro)
  theme.js            NUEVO — brokerPreset() (puro) + applySkin() (DOM)
  streak.js           NUEVO — computeStreak() (puro)
  achievements.js     NUEVO — ACHIEVEMENTS + evaluateAchievements() (puro)
  challenge.js        NUEVO — buildChallengeLink() / parseChallengeHash() (puro)
  views/onboarding.js NUEVO — 3 pantallas de bienvenida saltables
  views/challenge.js  NUEVO — pantalla "te desafiaron a superar X XP"
  views/dashboard.js  MODIF — más visual + selector de marca blanca + tasa de conversión
  views/league.js     MODIF — mostrar racha, medallas y botón "Desafiar a un amigo"
  views/home.js       MODIF — mostrar racha del usuario
  store.js            MODIF — DEFAULT_STATE gana settings.brokerSkin (ya está) y settings.onboardingDone
  app.js              MODIF — aplicar skin guardada al cargar; actualizar racha; ruta challenge; mostrar onboarding
  css/tokens.css      MODIF — variable --brand (default = oro) para el acento de marca
  css/components.css  MODIF — animaciones suaves (fade-in de vistas) + clase de medalla
  views/chat.js       MODIF — reemplazar hex suelto #1a2140 por variable CSS (pulido)
tests/
  brokers.test.js     NUEVO
  streak.test.js      NUEVO
  achievements.test.js NUEVO
  challenge.test.js   NUEVO
```

---

## Task 1: Presets de marca blanca + theming (TDD para la parte pura)

**Files:**
- Create: `public/js/data/brokers.js`
- Create: `public/js/theme.js`
- Modify: `public/css/tokens.css` (agregar `--brand`)
- Test: `tests/brokers.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `brokers.js`: `export const BROKERS` = objeto con claves `default`, `cocos`, `balanz`. Cada uno `{ id, name, brand, logo }` donde `brand` es un hex (acento de marca) y `logo` es el texto del wordmark. `default` = `{ id:'default', name:'FINEDU', brand:'#F59E0B', logo:'FINEDU' }`. `cocos` = `{ id:'cocos', name:'Cocos Capital', brand:'#16C784', logo:'cocos' }`. `balanz` = `{ id:'balanz', name:'Balanz', brand:'#2D6CDF', logo:'Balanz' }`.
  - `theme.js`: `brokerPreset(id)` → el preset de `BROKERS` por id (case-insensitive), o `BROKERS.default` si no existe (puro). `applySkin(id, doc = document)` → aplica el preset: setea `--brand` en `doc.documentElement.style` y devuelve el preset aplicado (para que el caller actualice el wordmark). (La parte DOM se valida a mano; `brokerPreset` se testea.)
- En `tokens.css`: agregar `--brand: var(--gold);` dentro de `:root` (el acento de marca por defecto es el oro). Las vistas que quieran "color de marca" usarán `var(--brand)`; el resto del oro queda como está.

- [ ] **Step 1: Escribir los tests que fallan**

```js
// tests/brokers.test.js
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
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existen los módulos).

- [ ] **Step 3: Implementar `public/js/data/brokers.js`**

```js
// brokers.js — presets de marca blanca (puro)
export const BROKERS = {
  default: { id: 'default', name: 'FINEDU', brand: '#F59E0B', logo: 'FINEDU' },
  cocos:   { id: 'cocos',   name: 'Cocos Capital', brand: '#16C784', logo: 'cocos' },
  balanz:  { id: 'balanz',  name: 'Balanz', brand: '#2D6CDF', logo: 'Balanz' },
};
```

- [ ] **Step 4: Implementar `public/js/theme.js`**

```js
// theme.js — selección y aplicación de marca blanca
import { BROKERS } from './data/brokers.js';

export function brokerPreset(id) {
  const key = String(id || '').toLowerCase();
  return BROKERS[key] || BROKERS.default;
}

export function applySkin(id, doc = document) {
  const preset = brokerPreset(id);
  doc.documentElement.style.setProperty('--brand', preset.brand);
  return preset;
}
```

- [ ] **Step 5: Modificar `public/css/tokens.css`**

Agregar dentro de `:root` (después de `--gold-2`):

```css
  --brand: var(--gold);
```

- [ ] **Step 6: Correr los tests**

Run: `npm test`
Expected: PASAN los 3 tests de `brokers.test.js` (y los 44 previos → 47).

- [ ] **Step 7: Commit**

```bash
git add public/js/data/brokers.js public/js/theme.js public/css/tokens.css tests/brokers.test.js
git commit -m "feat(fase4): presets de marca blanca y theming por --brand (TDD)"
```

---

## Task 2: Selector de marca blanca en el dashboard + aplicar al cargar

**Files:**
- Modify: `public/js/views/dashboard.js`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: `applySkin`, `brokerPreset` (theme.js); `BROKERS` (data/brokers.js); `store`; `el` (ui.js).
- Produces: en el dashboard ("Panel de aliado"), un selector "Vista previa marca blanca" con botones (FINEDU / Cocos / Balanz) que: llaman `applySkin(id)`, persisten `store.set('settings.brokerSkin', id)`, actualizan el wordmark del header de la app (el `.brand` en index.html / home) y re-renderizan. En `app.js`, al cargar, leer `store.get('settings.brokerSkin')` y llamar `applySkin(...)` + actualizar el wordmark, para que la skin elegida persista entre recargas.

- [ ] **Step 1: Agregar el selector en `dashboard.js`**

Importar al tope: `import { BROKERS } from '../data/brokers.js';` y `import { applySkin } from '../theme.js';` (junto a los imports existentes). Antes del `backBtn`, construir:

```js
  const current = store.get('settings.brokerSkin') || 'default';
  const skinCard = el('div', { class: 'card', style: 'margin-bottom:12px;' }, [
    el('div', { class: 'sub', style: 'font-size:11px;font-weight:600;margin-bottom:8px;letter-spacing:.05em;', text: 'Vista previa marca blanca' }),
    el('p', { class: 'sub', style: 'font-size:12px;margin:0 0 10px;', text: 'Así se vería FINEDU integrado en la app del broker.' }),
    el('div', { style: 'display:flex;gap:8px;' },
      Object.values(BROKERS).map((b) => el('button', {
        class: current === b.id ? 'btn btn-primary' : 'btn btn-secondary',
        style: 'flex:1;justify-content:center;margin:0;padding:9px;font-size:12px;',
        text: b.name.split(' ')[0],
        onclick: () => {
          applySkin(b.id);
          store.set('settings.brokerSkin', b.id);
          renderDashboard(container, { store });
        },
      })),
    ),
  ]);
```

Agregar `skinCard` al `container.append(...)` (antes de `backBtn`).

(Nota: el `--brand` se aplica al instante con `applySkin`. El wordmark visible está en la vista Inicio; al volver al Inicio se re-renderiza con el `logo` del preset porque home lee `settings.brokerSkin` del store — ver Task 3.)

- [ ] **Step 2: Aplicar la skin guardada al cargar en `app.js`**

Después de `const store = createStore();`, agregar:

```js
import { applySkin } from './theme.js';
// ...
applySkin(store.get('settings.brokerSkin'));
```

- [ ] **Step 3: Verificar**

Run: `node --check public/js/views/dashboard.js public/js/app.js` → sin salida.
Run: `npm test` → 47/47.

- [ ] **Step 4: Commit**

```bash
git add public/js/views/dashboard.js public/js/app.js
git commit -m "feat(fase4): selector de marca blanca en el dashboard y skin persistente"
```

---

## Task 3: Wordmark del Inicio según la skin + mostrar racha

**Files:**
- Modify: `public/js/views/home.js`

**Interfaces:**
- Consumes: `brokerPreset` (theme.js); `store`; `el` (ui.js).
- Produces: el header del Inicio usa el `logo` del preset de broker activo (en vez de "FINEDU" fijo) y su color de marca (`var(--brand)`). Además muestra la **racha** del usuario (`progress.streak`) como un pill "🔥 Racha N" si N>0.

- [ ] **Step 1: Modificar el header de `home.js`**

Importar `import { brokerPreset } from '../theme.js';`. Reemplazar el `head` actual por uno que lea el preset y la racha:

```js
  const preset = brokerPreset(store.get('settings.brokerSkin'));
  const streak = store.get('progress.streak') || 0;
  const head = el('div', {}, [
    el('h1', { html: `${preset.logo}<span style="color:var(--brand)">.</span>`, style: 'font-size:26px;' }),
    el('p', { class: 'sub', text: 'Practicá, aprendé y operá con confianza.', style: 'font-size:13px;margin-top:4px;' }),
    streak > 0 ? el('span', { class: 'pill pill-gold', text: `🔥 Racha ${streak}` }) : null,
  ].filter(Boolean));
```

(El resto de `renderHome` queda igual. Nota: `container.append(head, ...)` ya recibe nodos no-nulos; `head` es un solo nodo.)

- [ ] **Step 2: Verificar**

Run: `node --check public/js/views/home.js` → sin salida.
Run: `npm test` → 47/47.

- [ ] **Step 3: Commit**

```bash
git add public/js/views/home.js
git commit -m "feat(fase4): wordmark del Inicio segun marca blanca + pill de racha"
```

---

## Task 4: Racha diaria (TDD) + actualización al cargar

**Files:**
- Create: `public/js/streak.js`
- Modify: `public/js/app.js`
- Test: `tests/streak.test.js`

**Interfaces:**
- Consumes: nada (puro) en `streak.js`.
- Produces:
  - `computeStreak({ streak, lastActiveDate }, today)` → `{ streak, lastActiveDate }`. `today` es un string `YYYY-MM-DD`. Reglas: si `lastActiveDate === today` → sin cambios. Si `lastActiveDate` es el día anterior a `today` → `streak + 1`. Si no (gap o null) → `streak = 1`. Siempre setea `lastActiveDate = today`.
  - `todayStr(d = new Date())` → string `YYYY-MM-DD` (helper).
- En `app.js`: al cargar, `store.update` con `computeStreak` usando `todayStr()`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
// tests/streak.test.js
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
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existe `streak.js`).

- [ ] **Step 3: Implementar `public/js/streak.js`**

```js
// streak.js — lógica de racha diaria (pura)
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

export function computeStreak({ streak = 0, lastActiveDate = null }, today) {
  if (lastActiveDate === today) return { streak, lastActiveDate };
  if (lastActiveDate && prevDay(today) === lastActiveDate) {
    return { streak: streak + 1, lastActiveDate: today };
  }
  return { streak: 1, lastActiveDate: today };
}
```

- [ ] **Step 4: Wire en `app.js`**

Después de aplicar la skin, agregar:

```js
import { computeStreak, todayStr } from './streak.js';
// ...
store.update((s) => {
  const r = computeStreak(s.progress, todayStr());
  s.progress.streak = r.streak;
  s.progress.lastActiveDate = r.lastActiveDate;
});
```

- [ ] **Step 5: Correr los tests**

Run: `npm test`
Expected: PASAN los 5 de streak (y el resto → 52). `node --check public/js/app.js` sin salida.

- [ ] **Step 6: Commit**

```bash
git add public/js/streak.js public/js/app.js tests/streak.test.js
git commit -m "feat(fase4): racha diaria con logica testeada y actualizacion al cargar"
```

---

## Task 5: Logros / medallas (TDD) + otorgar y mostrar

**Files:**
- Create: `public/js/achievements.js`
- Modify: `public/js/app.js` (evaluar al cargar) y `public/js/views/league.js` (mostrar medallas)
- Modify: `public/css/components.css` (clase `.badge`)
- Test: `tests/achievements.test.js`

**Interfaces:**
- Consumes: nada (puro) en `achievements.js`.
- Produces:
  - `ACHIEVEMENTS` = array de `{ id, label, icon, check }` donde `check(state)` → boolean (recibe el estado completo del store). Logros: `primer_quiz` ('Primera lección', '🎓', xp>=50), `diversificado` ('Cartera diversa', '📊', ≥3 tickers con cantidad>0 en wallet.portfolio), `racha3` ('Racha de 3', '🔥', progress.streak>=3), `operador` ('Primeras operaciones', '📈', behavior.comprasTotales>=3), `perfilado` ('Perfil analizado', '🧠', behavior.turnos>=3).
  - `evaluateAchievements(state)` → array de ids que el estado **cumple** (no filtra por ya-ganados; eso lo hace el caller para detectar nuevos).
- En `app.js`: al cargar (y se puede re-evaluar tras acciones), calcular `evaluateAchievements(state)`, agregar los nuevos a `progress.achievements` (sin duplicar) y `toast` por cada nuevo. En `league.js`: mostrar las medallas ganadas como badges.

- [ ] **Step 1: Escribir los tests que fallan**

```js
// tests/achievements.test.js
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
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existe `achievements.js`).

- [ ] **Step 3: Implementar `public/js/achievements.js`**

```js
// achievements.js — definición y evaluación de logros (puro)
export const ACHIEVEMENTS = [
  { id: 'primer_quiz',  label: 'Primera lección', icon: '🎓', check: (s) => (s.progress?.xp || 0) >= 50 },
  { id: 'diversificado', label: 'Cartera diversa', icon: '📊', check: (s) => Object.values(s.wallet?.portfolio || {}).filter((h) => h.cantidad > 0).length >= 3 },
  { id: 'racha3',       label: 'Racha de 3', icon: '🔥', check: (s) => (s.progress?.streak || 0) >= 3 },
  { id: 'operador',     label: 'Primeras operaciones', icon: '📈', check: (s) => (s.behavior?.comprasTotales || 0) >= 3 },
  { id: 'perfilado',    label: 'Perfil analizado', icon: '🧠', check: (s) => (s.behavior?.turnos || 0) >= 3 },
];

export function evaluateAchievements(state) {
  return ACHIEVEMENTS.filter((a) => a.check(state)).map((a) => a.id);
}
```

- [ ] **Step 4: Otorgar en `app.js`**

Después del bloque de racha, agregar:

```js
import { ACHIEVEMENTS, evaluateAchievements } from './achievements.js';
import { toast } from './ui.js'; // si no está importado ya
// ...
{
  const st = store.getState();
  const ganados = new Set(st.progress.achievements || []);
  const nuevos = evaluateAchievements(st).filter((id) => !ganados.has(id));
  if (nuevos.length) {
    store.update((s) => { s.progress.achievements = [...(s.progress.achievements || []), ...nuevos]; });
    nuevos.forEach((id) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) toast(`${a.icon} ¡Logro: ${a.label}!`);
    });
  }
}
```

- [ ] **Step 5: Mostrar medallas en `league.js`**

Importar `import { ACHIEVEMENTS } from '../achievements.js';`. Dentro del card de la liga (antes del botón de invitar/volver), agregar una fila de medallas ganadas:

```js
  const ganados = store.get('progress.achievements') || [];
  const medallas = el('div', { style: 'margin-top:14px;' }, [
    el('div', { class: 'sub', style: 'font-size:11px;font-weight:600;margin-bottom:8px;', text: 'Tus logros' }),
    el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;' },
      ACHIEVEMENTS.map((a) => {
        const won = ganados.includes(a.id);
        return el('div', { class: 'badge', style: won ? '' : 'opacity:.35;filter:grayscale(1);', title: a.label }, [
          el('span', { text: a.icon }), el('span', { text: a.label, style: 'font-size:10px;' }),
        ]);
      })),
  ]);
```

(Agregarlo al contenido del card de la liga.)

- [ ] **Step 6: Estilo `.badge` en `components.css`**

```css
.badge { display:inline-flex; align-items:center; gap:5px; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:6px 10px; }
```

- [ ] **Step 7: Verificar y commit**

Run: `npm test` → 57. `node --check public/js/achievements.js public/js/app.js public/js/views/league.js` → sin salida.

```bash
git add public/js/achievements.js public/js/app.js public/js/views/league.js public/css/components.css tests/achievements.test.js
git commit -m "feat(fase4): logros con evaluacion testeada, otorgado por toast y medallas en la liga"
```

---

## Task 6: Desafío por link (TDD) + vista de desafío + botón

**Files:**
- Create: `public/js/challenge.js`
- Create: `public/js/views/challenge.js`
- Modify: `public/js/app.js` (ruta `challenge`) y `public/js/views/league.js` (botón "Desafiar a un amigo")
- Test: `tests/challenge.test.js`

**Interfaces:**
- Consumes: nada (puro) en `challenge.js`.
- Produces:
  - `buildChallengeLink(name, xp, origin)` → string URL: `${origin}/#/challenge?n=${encodeURIComponent(name)}&xp=${xp}`.
  - `parseChallengeHash(hash)` → `{ name, xp }` o `null` si no es un hash de desafío válido. Parsea `#/challenge?n=...&xp=...`; `xp` se convierte a entero (≥0); si falta o es inválido → `null`.
  - `views/challenge.js`: `renderChallenge(container, { store })` que lee el desafío del hash actual, muestra "🏆 {name} te desafió a superar {xp} XP" + tu XP actual + un CTA "Aceptar el desafío" que va al quiz (`#/quiz`). Si tu XP ya supera, felicita.

- [ ] **Step 1: Escribir los tests que fallan**

```js
// tests/challenge.test.js
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
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existe `challenge.js`).

- [ ] **Step 3: Implementar `public/js/challenge.js`**

```js
// challenge.js — desafío por link (puro, sin backend: el puntaje viaja en el querystring)
export function buildChallengeLink(name, xp, origin) {
  return `${origin}/#/challenge?n=${encodeURIComponent(name)}&xp=${xp}`;
}

export function parseChallengeHash(hash) {
  const s = String(hash || '');
  if (!s.startsWith('#/challenge?')) return null;
  const qs = new URLSearchParams(s.slice(s.indexOf('?') + 1));
  const name = qs.get('n');
  const xpRaw = qs.get('xp');
  if (name == null || xpRaw == null) return null;
  const xp = Number.parseInt(xpRaw, 10);
  if (!Number.isFinite(xp) || xp < 0) return null;
  return { name, xp };
}
```

- [ ] **Step 4: Implementar `public/js/views/challenge.js`**

```js
// challenge.js (vista) — pantalla de "te desafiaron"
import { el } from '../ui.js';
import { parseChallengeHash } from '../challenge.js';

export function renderChallenge(container, { store }) {
  container.innerHTML = '';
  const ch = parseChallengeHash(location.hash);
  const myXp = store.get('progress.xp') || 0;

  if (!ch) {
    container.append(el('h2', { text: 'Desafío' }), el('p', { class: 'sub', text: 'Link de desafío inválido.' }),
      el('button', { class: 'btn btn-secondary', text: 'Ir al inicio', onclick: () => { location.hash = '#/home'; } }));
    return;
  }

  const superado = myXp >= ch.xp;
  container.append(
    el('div', { class: 'card center', style: 'padding:24px;' }, [
      el('div', { style: 'font-size:40px;margin-bottom:8px;', text: '🏆' }),
      el('h2', { text: `${ch.name} te desafió`, style: 'margin:0 0 4px;' }),
      el('p', { class: 'sub', html: `Tenés que superar <b class="tnum">${ch.xp} XP</b>.`, style: 'font-size:14px;' }),
      el('div', { class: 'tnum', text: `Tu XP: ${myXp}`, style: `font-size:22px;font-weight:700;color:${superado ? 'var(--green)' : 'var(--brand)'};margin:10px 0;` }),
      superado
        ? el('p', { style: 'color:var(--green);font-weight:600;', text: '¡Ya lo superaste! 🎉' })
        : el('button', { class: 'btn btn-primary', text: 'Aceptar el desafío → Aprender', onclick: () => { location.hash = '#/quiz'; } }),
    ]),
    el('button', { class: 'btn btn-secondary', style: 'margin-top:10px;', text: 'Ir al inicio', onclick: () => { location.hash = '#/home'; } }),
  );
}
```

- [ ] **Step 5: Registrar la ruta en `app.js`**

```js
import { renderChallenge } from './views/challenge.js';
// ...
  challenge: (c) => renderChallenge(c, { store }),
```

(Nota: el router resuelve `#/challenge?...` a la ruta `challenge` porque corta en `?` — ver `resolveRoute`.)

- [ ] **Step 6: Botón "Desafiar a un amigo" en `league.js`**

Importar `import { buildChallengeLink } from '../challenge.js';` y `toast` de ui.js. Agregar un botón en el card de la liga:

```js
  const desafiarBtn = el('button', {
    class: 'btn btn-secondary', style: 'margin-top:10px;',
    text: '🔗 Desafiar a un amigo',
    onclick: async () => {
      const xp = store.get('progress.xp') || 0;
      const link = buildChallengeLink('Vos', xp, location.origin);
      try { await navigator.clipboard.writeText(link); toast('¡Link de desafío copiado! Mandáselo a un amigo.'); }
      catch { toast(link); }
      store.update((s) => { s.metrics.shared = (s.metrics.shared || 0) + 1; });
    },
  });
```

(Agregar `desafiarBtn` al contenido del card.)

- [ ] **Step 7: Verificar y commit**

Run: `npm test` → 61. `node --check public/js/challenge.js public/js/views/challenge.js public/js/app.js public/js/views/league.js` → sin salida.

```bash
git add public/js/challenge.js public/js/views/challenge.js public/js/app.js public/js/views/league.js tests/challenge.test.js
git commit -m "feat(fase4): desafio por link (encode/decode testeado), vista y boton en la liga"
```

---

## Task 7: Onboarding corto saltable

**Files:**
- Create: `public/js/views/onboarding.js`
- Modify: `public/js/store.js` (`settings.onboardingDone`)
- Modify: `public/js/app.js` (mostrar onboarding al primer ingreso)

**Interfaces:**
- Consumes: `el` (ui.js); `store`.
- Produces: `mountOnboarding({ store, onDone })` que, si `store.get('settings.onboardingDone')` es falsy, muestra un overlay de 3 pantallas (propuesta de valor) con "Siguiente"/"Saltar"/"Empezar"; al terminar o saltar, setea `settings.onboardingDone=true` y llama `onDone()`. Si ya está hecho, no muestra nada.

- [ ] **Step 1: Agregar el flag en `DEFAULT_STATE` (`store.js`)**

```js
  settings: { theme: 'dark', brokerSkin: null, onboardingDone: false },
```

- [ ] **Step 2: Implementar `public/js/views/onboarding.js`**

```js
// onboarding.js — bienvenida de 3 pantallas, saltable
import { el } from '../ui.js';

const SLIDES = [
  { icon: '📈', title: 'Practicá sin riesgo', text: 'Operá con dinero virtual en un simulador realista y entendé cómo se mueve el mercado.' },
  { icon: '🧠', title: 'Aprendé jugando', text: 'Micro-lecciones tipo trivia y un Asesor IA que te explica con tus propias decisiones.' },
  { icon: '🛡️', title: 'Ganá confianza', text: 'Conocé tu perfil de riesgo, evitá fraudes y prepárate para operar de verdad.' },
];

export function mountOnboarding({ store, onDone }) {
  if (store.get('settings.onboardingDone')) { onDone(); return; }
  let i = 0;
  const overlay = el('div', { style: 'position:fixed;inset:0;z-index:80;background:var(--navy);display:flex;flex-direction:column;justify-content:center;padding:32px;max-width:480px;margin:0 auto;' });

  function finish() {
    store.set('settings.onboardingDone', true);
    overlay.remove();
    onDone();
  }
  function render() {
    overlay.innerHTML = '';
    const s = SLIDES[i];
    overlay.append(
      el('div', { class: 'center', style: 'flex:1;display:flex;flex-direction:column;justify-content:center;' }, [
        el('div', { style: 'font-size:56px;margin-bottom:16px;', text: s.icon }),
        el('h1', { text: s.title, style: 'font-size:26px;margin:0 0 10px;' }),
        el('p', { class: 'sub', text: s.text, style: 'font-size:15px;line-height:1.5;' }),
        el('div', { style: 'display:flex;gap:6px;justify-content:center;margin-top:20px;' },
          SLIDES.map((_, j) => el('span', { style: `width:8px;height:8px;border-radius:50%;background:${j === i ? 'var(--brand)' : 'var(--border)'};` }))),
      ]),
      el('button', { class: 'btn btn-primary', text: i < SLIDES.length - 1 ? 'Siguiente' : 'Empezar', onclick: () => { if (i < SLIDES.length - 1) { i++; render(); } else finish(); } }),
      el('button', { class: 'btn btn-ghost', text: 'Saltar', onclick: finish }),
    );
  }
  render();
  document.body.append(overlay);
}
```

- [ ] **Step 3: Mostrar el onboarding en `app.js`**

Envolver el arranque del router para que el onboarding corra primero:

```js
import { mountOnboarding } from './views/onboarding.js';
// ... (después de crear router, en vez de router.start() directo:)
mountOnboarding({ store, onDone: () => router.start() });
```

(Reemplazar la llamada directa `router.start();` por la línea de arriba. El resto del wiring —chat, eventos— queda igual.)

- [ ] **Step 4: Verificar y commit**

Run: `npm test` → 61 (sin tests nuevos; el flag es additivo y la migración deepMerge lo cubre). `node --check public/js/views/onboarding.js public/js/store.js public/js/app.js` → sin salida.

```bash
git add public/js/views/onboarding.js public/js/store.js public/js/app.js
git commit -m "feat(fase4): onboarding de 3 pantallas saltable al primer ingreso"
```

---

## Task 8: Dashboard más visual + pulido final + verificación

**Files:**
- Modify: `public/js/views/dashboard.js` (tasa de conversión + barra de métricas)
- Modify: `public/js/views/chat.js` (reemplazar hex `#1a2140` por variable)
- Modify: `public/css/tokens.css` (variable `--chat-bot`) y `public/css/components.css` (fade-in de vistas)

**Interfaces:**
- Consumes: lo existente.
- Produces: el dashboard muestra una **tasa de conversión** computada (`(brokerSim+brokerQuiz) / max(1, turnos+quizLevelsDone)` como % aproximado, etiquetada como "interés→acción") y las 4 métricas con una mini-barra proporcional. El chat usa `var(--chat-bot)` en vez del hex suelto. Las vistas tienen un fade-in suave.

- [ ] **Step 1: Pulido del chat (`chat.js`)**

Reemplazar las dos ocurrencias de `background:#1a2140` por `background:var(--chat-bot)`. Agregar en `tokens.css` dentro de `:root`: `--chat-bot: #1a2140;`.

- [ ] **Step 2: Fade-in de vistas (`components.css`)**

```css
#app-view { animation: viewIn .18s ease; }
@keyframes viewIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
@media (prefers-reduced-motion: reduce) { #app-view { animation: none; } }
```

- [ ] **Step 3: Tasa de conversión en `dashboard.js`**

Antes de la grilla de métricas, calcular y mostrar una tarjeta:

```js
  const turnos = store.get('behavior.turnos') || 0;
  const niveles = (store.get('progress.quizLevelsDone') || []).length;
  const actividad = Math.max(1, turnos + niveles);
  const convPct = Math.min(100, Math.round(((brokerSim + brokerQuiz) / actividad) * 100));
  const convCard = el('div', { class: 'card', style: 'margin-bottom:12px;text-align:center;' }, [
    el('div', { class: 'sub', style: 'font-size:11px;font-weight:600;', text: 'Conversión interés → acción (broker)' }),
    el('div', { class: 'tnum', style: 'font-size:30px;font-weight:700;color:var(--brand);', text: convPct + '%' }),
    el('div', { class: 'sub', style: 'font-size:11px;', text: `${brokerSim + brokerQuiz} clicks al broker sobre ${actividad} acciones educativas` }),
  ]);
```

Agregar `convCard` al `container.append(...)` (después de `headerCard`).

- [ ] **Step 4: Verificar y commit**

Run: `npm test` → 61. `node --check public/js/views/dashboard.js public/js/views/chat.js` → sin salida.

```bash
git add public/js/views/dashboard.js public/js/views/chat.js public/css/tokens.css public/css/components.css
git commit -m "feat(fase4): dashboard con tasa de conversion, fade-in de vistas y pulido del chat"
```

- [ ] **Step 5: Verificación integral (estática + manual)**

Run: `npm test` → todos verdes.
Run: `node --check` sobre todos los archivos nuevos/modificados.
Checks: no `alert(`/`confirm(` nativos nuevos; el violeta sigue solo en superficies de IA; sin hex crudo nuevo en JS de vistas (salvo lo ya migrado a var); la API key sigue sin aparecer en `public/`.

Recorrido manual (lo corre el humano con `npm run dev` o en finedufce.netlify.app tras deploy):
- **Marca blanca:** Dashboard → selector Cocos/Balanz → la app cambia el acento de marca y el wordmark del Inicio; persiste al recargar.
- **Racha:** al entrar, se ve "🔥 Racha N" en el Inicio.
- **Logros:** al cumplir condiciones (hacer un quiz, diversificar, etc.) aparece el toast y la medalla en la Liga.
- **Desafío:** Liga → "Desafiar a un amigo" copia un link; abrir ese link (#/challenge?...) muestra la pantalla de desafío.
- **Onboarding:** primer ingreso (o tras borrar localStorage) muestra las 3 pantallas; "Saltar"/"Empezar" no vuelve a aparecer.
- **Pulido:** transición suave entre vistas; chat sin cambios visuales rotos.
- Todo lo de Fases 0-2 sigue andando (sim, quiz, IA, perfil, anti-fraude).

---

## Self-Review (cobertura del alcance Fase 4)

- **Marca blanca** → Task 1 (presets + --brand) + Task 2 (selector + persistencia) + Task 3 (wordmark). ✓
- **Dashboard mejorado** → Task 2 (selector embebido) + Task 8 (tasa de conversión + visual). ✓
- **Viralidad local** → Task 4 (racha) + Task 5 (logros/medallas) + Task 6 (desafío por link). ✓
- **Onboarding + pulido** → Task 7 (onboarding) + Task 8 (fade-in, chat var). ✓
- **Sin backend nuevo / no Supabase** → todo client-side; el desafío viaja en el querystring. ✓
- **No regresión** → tareas additivas; 44 tests previos + nuevos (brokers/streak/achievements/challenge) → ~61. ✓
- **Roadmap (fuera de alcance):** cuentas reales/persistencia cross-device (Supabase) — diferido por decisión de producto (la identidad la provee el broker en producción).

**Nota de granularidad:** la lógica testeable (presets, racha, logros, link de desafío) está cubierta por `node:test`; theming, vistas y onboarding se validan con `node --check` + recorrido manual (sin framework de DOM, por decisión de Fase 0). Las vistas traen código completo en el plan.
