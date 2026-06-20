# FINEDU v2 — Fase 2: IA real — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el pilar de IA (hoy un chat falso) en IA real vía backend: un chat tutor "maestro y garante" con contexto del usuario, un perfil de riesgo conductual, y un escudo anti-fraude — todo con la API key protegida del lado servidor y con fallback offline para que la demo nunca se rompa.

**Architecture:** Una única función serverless `netlify/functions/ai.js` (formato Web estándar `export default async (request) => Response`) rutea por `intent` (chat | profile | fraud) y llama a Gemini 2.5 Flash. La lógica pura (construcción de prompts, parseo, fallbacks, perfil heurístico local) vive en `netlify/functions/_lib/` (ignorado por Netlify como función) y se testea en Node con `fetch` inyectado. El front llama a la función vía `public/js/api.js`. Para correr local sin instalar netlify-cli, un `dev-server.js` (solo desarrollo, sin dependencias) sirve el front y ejecuta la función. La key se lee de `process.env.GEMINI_API_KEY` (local: `.env` + `node --env-file`; producción: env var de Netlify).

**Tech Stack:** JavaScript ES Modules; Web Fetch/Request/Response (nativos en Node v24 y en Netlify Functions); Gemini REST API (`gemini-2.5-flash`); `node:test`; `node --env-file=.env` para secretos locales.

## Global Constraints

- **Sin build step. Sin dependencias de runtime ni de la función.** Solo APIs nativas de Node v24 (fetch/Request/Response) y del navegador. `dev-server.js` usa solo `node:http`/`node:fs`.
- **La API key NUNCA llega al front.** Vive en `process.env.GEMINI_API_KEY` (servidor). El `.env` está en `.gitignore`. Modelo: `gemini-2.5-flash`.
- **Fallback obligatorio en cada intent:** si falta la key, o Gemini falla, o no hay red, la función devuelve una respuesta útil pre-cargada (`source: 'fallback'`). La demo funciona aun sin key.
- **Violeta es el color de la IA.** Las superficies de IA (chat, perfil, anti-fraude) usan `var(--violet)` y derivados. El resto de la paleta y reglas de Fase 0/1 siguen.
- **Sin `alert()`/`confirm()` nativos:** `toast()`/`confirmModal()` de `ui.js`. DOM con `el()`; datos dinámicos por `text:` (no innerHTML salvo `container.innerHTML=''`).
- **Tipografía IBM Plex Sans, cifras `.tnum`, colores por variables CSS (no hex crudo en JS de vistas).** Español rioplatense.
- **La IA educa, no da consejos de inversión reales** — el system-prompt debe dejarlo explícito y el tono es de tutor.
- **No romper lo existente:** simulador, quiz, liga, dashboard, inicio siguen funcionando; los 22 tests actuales siguen verdes.
- **Netlify Functions:** archivos/carpetas que empiezan con `_` dentro de `netlify/functions/` NO se tratan como funciones (por eso `_lib/` es seguro para código compartido). Solo `ai.js` es endpoint.

---

## File Structure

```
.env                              YA EXISTE (gitignored) — GEMINI_API_KEY
netlify/functions/
  ai.js                           NUEVO — handler Netlify (thin): parsea request, llama handleAi, responde
  _lib/
    prompts.js                    NUEVO — system-prompts + buildRequestBody(intent,payload) (puro)
    fallbacks.js                  NUEVO — localProfile, fraudHeuristic, chatFallback, carteraFor (puro)
    ai-core.js                    NUEVO — handleAi({body, apiKey, fetchFn}) + parseo de respuesta Gemini
dev-server.js                     NUEVO (solo dev) — sirve public/ y ejecuta /.netlify/functions/ai
public/js/
  api.js                          NUEVO — callAI(intent, payload) (cliente fetch)
  views/chat.js                   MODIF — chat real con contexto + skeleton + fallback
  views/profile.js                NUEVO — perfil de riesgo conductual (IA) + cartera Graham
  views/fraud.js                  NUEVO — escudo anti-fraude (verificar URL/entidad)
  views/home.js                   MODIF — botón de acceso al escudo anti-fraude
  views/sim.js                    MODIF — botón "Analizar mi perfil con IA" (tras 3 turnos) + nudge de pánico/FOMO
  app.js                          MODIF — registrar rutas profile y fraud
tests/
  prompts.test.js                 NUEVO
  fallbacks.test.js               NUEVO
  ai-core.test.js                 NUEVO
package.json                      MODIF — script "dev" usa node --env-file
```

**Decisión de límites:** la lógica testeable (prompts, fallbacks, parseo, perfil local) se separa en `_lib/` con `fetch` inyectable; `ai.js` es un wrapper fino que solo traduce `Request`↔`Response`. Así testeamos el cerebro sin red ni DOM. Las vistas (chat/profile/fraud) son la única capa que toca el DOM y se validan a mano. `dev-server.js` replica el contrato de Netlify localmente para no instalar netlify-cli.

---

## Task 1: `_lib/prompts.js` — system-prompts y armado del request (TDD)

**Files:**
- Create: `netlify/functions/_lib/prompts.js`
- Test: `tests/prompts.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `MODEL` = `'gemini-2.5-flash'` (export const).
  - `SYSTEM_PROMPTS` = objeto con claves `chat`, `profile`, `fraud` (strings). El de `chat` instruye: tutor financiero argentino, criterio de Benjamin Graham, lenguaje claro sin jerga, **educa y NO da consejos de inversión reales**, puede comentar la conducta del usuario. El de `profile` pide devolver exactamente `PERFIL|justificación` con PERFIL ∈ {CONSERVADOR, MODERADO, AGRESIVO}. El de `fraud` pide devolver `VEREDICTO|motivo` con VEREDICTO ∈ {SOSPECHOSO, PRECAUCIÓN, PROBABLEMENTE_LEGÍTIMO} y siempre recordar verificar en el registro de la CNV.
  - `buildRequestBody(intent, payload)` → objeto cuerpo para la REST de Gemini: `{ systemInstruction: { parts: [{ text }] }, contents: [...] }`. Para `chat`: `payload = { messages:[{role:'user'|'bot', text}], context:{cartera, ultimasOps, pantalla} }` → `contents` mapea messages a `{role:'user'|'model', parts:[{text}]}` y antepone un turno de usuario con el contexto serializado. Para `profile`: `payload = { behavior, portfolio }` → un solo turno de usuario con los datos. Para `fraud`: `payload = { input }` → un solo turno de usuario con el texto a verificar. Pura (sin red).

- [ ] **Step 1: Escribir los tests que fallan**

```js
// tests/prompts.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL, SYSTEM_PROMPTS, buildRequestBody } from '../netlify/functions/_lib/prompts.js';

test('MODEL es gemini-2.5-flash', () => {
  assert.equal(MODEL, 'gemini-2.5-flash');
});

test('hay system prompts para los tres intents', () => {
  for (const k of ['chat', 'profile', 'fraud']) {
    assert.equal(typeof SYSTEM_PROMPTS[k], 'string');
    assert.ok(SYSTEM_PROMPTS[k].length > 20);
  }
});

test('el system prompt de chat aclara que no da consejos reales', () => {
  assert.match(SYSTEM_PROMPTS.chat.toLowerCase(), /no.*consejos|educ/);
});

test('buildRequestBody(chat) mapea messages a roles de Gemini e incluye contexto', () => {
  const body = buildRequestBody('chat', {
    messages: [{ role: 'user', text: 'hola' }, { role: 'bot', text: 'qué tal' }, { role: 'user', text: '¿qué es un CEDEAR?' }],
    context: { cartera: { 'MELI': 2 }, ultimasOps: ['compra MELI'], pantalla: 'sim' },
  });
  assert.equal(body.systemInstruction.parts[0].text, SYSTEM_PROMPTS.chat);
  // el primer turno es el contexto (role user), luego la conversación
  assert.equal(body.contents[0].role, 'user');
  assert.match(body.contents[0].parts[0].text, /MELI/);
  // 'bot' se mapea a 'model'
  const roles = body.contents.map((c) => c.role);
  assert.ok(roles.includes('model'));
  assert.equal(body.contents[body.contents.length - 1].parts[0].text, '¿qué es un CEDEAR?');
});

test('buildRequestBody(profile) incluye los datos de conducta', () => {
  const body = buildRequestBody('profile', { behavior: { ventasEnBaja: 3, comprasEnAlza: 1, turnos: 5, scoreRiesgo: 12 }, portfolio: { MELI: { cantidad: 2 } } });
  assert.equal(body.systemInstruction.parts[0].text, SYSTEM_PROMPTS.profile);
  assert.match(body.contents[0].parts[0].text, /ventasEnBaja|pánico|3/);
});

test('buildRequestBody(fraud) incluye el texto a verificar', () => {
  const body = buildRequestBody('fraud', { input: 'inversiones-seguras-xyz.com' });
  assert.equal(body.systemInstruction.parts[0].text, SYSTEM_PROMPTS.fraud);
  assert.match(body.contents[0].parts[0].text, /inversiones-seguras-xyz\.com/);
});
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existe `prompts.js`).

- [ ] **Step 3: Implementar `netlify/functions/_lib/prompts.js`**

```js
// prompts.js — system-prompts y armado del cuerpo de la request a Gemini (puro)
export const MODEL = 'gemini-2.5-flash';

export const SYSTEM_PROMPTS = {
  chat:
    'Sos el "Asesor IA" de FINEDU, una app argentina de educación financiera. Actuás como un tutor cercano ' +
    '(maestro y garante) para un inversor minorista principiante. Hablás en español rioplatense, claro y sin jerga. ' +
    'Te basás en el criterio de inversión en valor de Benjamin Graham (margen de seguridad, Mr. Market, largo plazo, ' +
    'diversificación). Conocés instrumentos argentinos: CEDEARs, ETFs CEDEAR (SPY, QQQ), acciones (MELI, VIST) y ' +
    'Obligaciones Negociables. IMPORTANTE: educás, NO das consejos de inversión reales ni recomendaciones de compra/venta; ' +
    'si te piden "qué comprar", explicás cómo razonarlo. Podés comentar la conducta del usuario en el simulador con tacto. ' +
    'Respuestas breves (máx 5 líneas), concretas y amables.',
  profile:
    'Sos un analista de finanzas conductuales. A partir de las decisiones de un usuario en un simulador de inversión bajo ' +
    'estrés y volatilidad, perfilás su riesgo psicológico real. Usás terminología de sesgos (aversión a la pérdida, FOMO, ' +
    'exceso de confianza, diversificación). DEVOLVÉ EXACTAMENTE este formato: primero una sola palabra CONSERVADOR, MODERADO ' +
    'o AGRESIVO; luego un caracter pipe "|"; luego un párrafo de máximo 4 líneas justificando, en español rioplatense.',
  fraud:
    'Sos un escudo anti-fraude financiero para usuarios argentinos. Te pasan una URL, nombre de plataforma o propuesta de ' +
    'inversión y evaluás señales de riesgo (promesas de rendimiento garantizado, urgencia, dominios raros, falta de registro). ' +
    'NO tenés acceso en vivo a bases de datos. DEVOLVÉ EXACTAMENTE este formato: primero una sola etiqueta SOSPECHOSO, ' +
    'PRECAUCIÓN o PROBABLEMENTE_LEGÍTIMO; luego un caracter pipe "|"; luego 2-3 líneas en español rioplatense explicando por ' +
    'qué, y SIEMPRE recordá verificar si la entidad está registrada en el registro oficial de la CNV (argentina.gob.ar/cnv).',
};

function userTurn(text) { return { role: 'user', parts: [{ text }] }; }

export function buildRequestBody(intent, payload = {}) {
  const system = SYSTEM_PROMPTS[intent] || SYSTEM_PROMPTS.chat;
  let contents;
  if (intent === 'chat') {
    const ctx = payload.context || {};
    const ctxText =
      'Contexto del usuario (no lo repitas literal): ' +
      `pantalla=${ctx.pantalla || 'desconocida'}; ` +
      `cartera=${JSON.stringify(ctx.cartera || {})}; ` +
      `últimas operaciones=${JSON.stringify(ctx.ultimasOps || [])}.`;
    const convo = (payload.messages || []).map((m) =>
      ({ role: m.role === 'bot' ? 'model' : 'user', parts: [{ text: m.text }] }));
    contents = [userTurn(ctxText), ...convo];
  } else if (intent === 'profile') {
    const b = payload.behavior || {};
    const text =
      'Datos de comportamiento del usuario en el simulador:\n' +
      `- Compras en escenarios de alza (FOMO): ${b.comprasEnAlza || 0}\n` +
      `- Ventas en escenarios de baja (pánico / aversión a la pérdida): ${b.ventasEnBaja || 0}\n` +
      `- Turnos operando: ${b.turnos || 0}\n` +
      `- Score de riesgo acumulado: ${b.scoreRiesgo || 0}\n` +
      `- Cartera actual: ${JSON.stringify(payload.portfolio || {})}\n` +
      'Clasificá su perfil con el formato pedido.';
    contents = [userTurn(text)];
  } else {
    // fraud
    contents = [userTurn(`Evaluá esta inversión/URL/plataforma: "${payload.input || ''}". Respondé con el formato pedido.`)];
  }
  return { systemInstruction: { parts: [{ text: system }] }, contents };
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test`
Expected: PASAN los 6 tests de `prompts.test.js` (y siguen los 22).

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/_lib/prompts.js tests/prompts.test.js
git commit -m "feat(fase2): prompts e build del request a Gemini por intent (TDD)"
```

---

## Task 2: `_lib/fallbacks.js` — cerebro offline (perfil heurístico, anti-fraude, chat) (TDD)

**Files:**
- Create: `netlify/functions/_lib/fallbacks.js`
- Test: `tests/fallbacks.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `carteraFor(perfil)` → array de `{ label, pct, color }` (cartera Graham sugerida por perfil; `perfil` ∈ 'Conservador'|'Moderado'|'Agresivo', case-insensitive). `color` es un nombre de variable CSS sin `var()` (ej. `'--green'`).
  - `localProfile(behavior, portfolio)` → `{ perfil, dictamen, cartera, source:'fallback' }`. Heurística: si `ventasEnBaja >= 2` → 'Conservador' (reactivo al pánico); si `comprasEnAlza >= 2` → 'Agresivo' (FOMO); si no, según `scoreRiesgo`: `<6` Conservador, `<14` Moderado, si no Agresivo. `dictamen` es un texto templado coherente. `cartera = carteraFor(perfil)`.
  - `fraudHeuristic(input)` → `{ veredicto, motivo, source:'fallback' }`. Reglas simples: si el input contiene un broker conocido (`/(iol|invertironline|cocos|balanz|bull market|byma|cnv)/i`) → 'PRECAUCIÓN' con motivo de "verificá igual en CNV"; si contiene señales de estafa (`/(garantiz|sin riesgo|duplic|x2|rendimiento asegurado|urgente)/i`) → 'SOSPECHOSO'; si no → 'PRECAUCIÓN'. Siempre menciona verificar en la CNV.
  - `chatFallback()` → string útil que reconoce que el asesor está temporalmente offline y da un tip de Graham.
  - `parsePipe(text)` → `[antes, despues]` (helper para parsear "ETIQUETA|texto"; si no hay pipe, `[text, '']`).

- [ ] **Step 1: Escribir los tests que fallan**

```js
// tests/fallbacks.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carteraFor, localProfile, fraudHeuristic, chatFallback, parsePipe } from '../netlify/functions/_lib/fallbacks.js';

test('carteraFor devuelve una cartera por perfil con porcentajes', () => {
  for (const p of ['Conservador', 'Moderado', 'Agresivo']) {
    const c = carteraFor(p);
    assert.ok(Array.isArray(c) && c.length >= 2);
    const total = c.reduce((s, x) => s + x.pct, 0);
    assert.equal(total, 100);
  }
});

test('localProfile detecta pánico (ventasEnBaja) como Conservador', () => {
  const r = localProfile({ ventasEnBaja: 3, comprasEnAlza: 0, scoreRiesgo: 20, turnos: 5 }, {});
  assert.equal(r.perfil, 'Conservador');
  assert.equal(r.source, 'fallback');
  assert.ok(r.dictamen.length > 10);
  assert.ok(Array.isArray(r.cartera));
});

test('localProfile detecta FOMO (comprasEnAlza) como Agresivo', () => {
  const r = localProfile({ ventasEnBaja: 0, comprasEnAlza: 3, scoreRiesgo: 2, turnos: 5 }, {});
  assert.equal(r.perfil, 'Agresivo');
});

test('localProfile sin señales usa scoreRiesgo', () => {
  assert.equal(localProfile({ scoreRiesgo: 2 }, {}).perfil, 'Conservador');
  assert.equal(localProfile({ scoreRiesgo: 10 }, {}).perfil, 'Moderado');
  assert.equal(localProfile({ scoreRiesgo: 20 }, {}).perfil, 'Agresivo');
});

test('fraudHeuristic marca señales de estafa como SOSPECHOSO', () => {
  const r = fraudHeuristic('Invertí y duplicá tu dinero sin riesgo, rendimiento garantizado');
  assert.equal(r.veredicto, 'SOSPECHOSO');
  assert.match(r.motivo.toLowerCase(), /cnv/);
});

test('fraudHeuristic reconoce brokers conocidos como PRECAUCIÓN', () => {
  const r = fraudHeuristic('cocos capital');
  assert.equal(r.veredicto, 'PRECAUCIÓN');
});

test('chatFallback devuelve un mensaje no vacío', () => {
  assert.ok(chatFallback().length > 20);
});

test('parsePipe separa etiqueta y texto', () => {
  assert.deepEqual(parsePipe('AGRESIVO|toma mucho riesgo'), ['AGRESIVO', 'toma mucho riesgo']);
  assert.deepEqual(parsePipe('sin pipe'), ['sin pipe', '']);
});
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existe `fallbacks.js`).

- [ ] **Step 3: Implementar `netlify/functions/_lib/fallbacks.js`**

```js
// fallbacks.js — cerebro offline / respuestas de respaldo (puro)
export function parsePipe(text) {
  const s = String(text || '');
  const i = s.indexOf('|');
  if (i === -1) return [s.trim(), ''];
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}

export function carteraFor(perfil) {
  const p = String(perfil || '').toLowerCase();
  if (p.includes('conserv')) {
    return [
      { label: 'YMCXO (Obligaciones Negociables)', pct: 55, color: '--green' },
      { label: 'SPY (S&P 500 ETF)', pct: 30, color: '--gold' },
      { label: 'Efectivo líquido', pct: 15, color: '--sub' },
    ];
  }
  if (p.includes('agres')) {
    return [
      { label: 'MELI / VIST (acciones valor)', pct: 50, color: '--red' },
      { label: 'QQQ (Nasdaq ETF)', pct: 35, color: '--gold' },
      { label: 'YMCXO (ON de resguardo)', pct: 15, color: '--green' },
    ];
  }
  return [
    { label: 'SPY / QQQ (índices CEDEAR)', pct: 40, color: '--gold' },
    { label: 'YMCXO (renta fija ON)', pct: 35, color: '--green' },
    { label: 'VIST / MELI (crecimiento)', pct: 25, color: '--red' },
  ];
}

export function localProfile(behavior = {}, portfolio = {}) {
  const ventasEnBaja = behavior.ventasEnBaja || 0;
  const comprasEnAlza = behavior.comprasEnAlza || 0;
  const score = behavior.scoreRiesgo || 0;
  let perfil;
  if (ventasEnBaja >= 2) perfil = 'Conservador';
  else if (comprasEnAlza >= 2) perfil = 'Agresivo';
  else if (score < 6) perfil = 'Conservador';
  else if (score < 14) perfil = 'Moderado';
  else perfil = 'Agresivo';

  const dictamenes = {
    Conservador: 'Tus decisiones muestran aversión a la pérdida: tendés a vender cuando el mercado baja. ' +
      'Priorizá renta fija y diversificación para no operar por miedo. El margen de seguridad de Graham es tu aliado.',
    Moderado: 'Mostrás un equilibrio razonable entre riesgo y prudencia. Sostené la diversificación y evitá ' +
      'dejarte llevar por el ruido del cable de noticias. La paciencia es tu ventaja.',
    Agresivo: 'Tomás riesgo y a veces comprás en euforia (FOMO). Cuidado con el exceso de confianza: ' +
      'contrastá siempre con los fundamentos y mantené un colchón de resguardo.',
  };
  return { perfil, dictamen: dictamenes[perfil], cartera: carteraFor(perfil), source: 'fallback' };
}

export function fraudHeuristic(input) {
  const s = String(input || '').toLowerCase();
  const cnv = ' Verificá siempre si la entidad está registrada en el registro oficial de la CNV (argentina.gob.ar/cnv).';
  if (/(garantiz|sin riesgo|duplic|x2|rendimiento asegurado|urgente|ganancia segura)/.test(s)) {
    return { veredicto: 'SOSPECHOSO', motivo: 'Promete rendimientos garantizados o usa urgencia: señales clásicas de estafa.' + cnv, source: 'fallback' };
  }
  if (/(iol|invertironline|cocos|balanz|bull market|byma|cnv)/.test(s)) {
    return { veredicto: 'PRECAUCIÓN', motivo: 'Parece una entidad del ecosistema local conocido, pero confirmá la dirección exacta.' + cnv, source: 'fallback' };
  }
  return { veredicto: 'PRECAUCIÓN', motivo: 'No reconozco señales claras. No bajes la guardia.' + cnv, source: 'fallback' };
}

export function chatFallback() {
  return 'El Asesor IA está sin conexión por un momento. Mientras tanto, un principio de Graham: invertí con ' +
    '"margen de seguridad" (comprá por debajo del valor que estimás) y no operes por miedo o euforia. Probá de nuevo en un rato.';
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test`
Expected: PASAN los 8 tests de `fallbacks.test.js`.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/_lib/fallbacks.js tests/fallbacks.test.js
git commit -m "feat(fase2): cerebro offline (perfil heuristico, anti-fraude, chat fallback) TDD"
```

---

## Task 3: `_lib/ai-core.js` — orquestador con `fetch` inyectado y fallback (TDD)

**Files:**
- Create: `netlify/functions/_lib/ai-core.js`
- Test: `tests/ai-core.test.js`

**Interfaces:**
- Consumes: `MODEL`, `buildRequestBody` (prompts.js); `localProfile`, `fraudHeuristic`, `chatFallback`, `carteraFor`, `parsePipe` (fallbacks.js).
- Produces: `handleAi({ body, apiKey, fetchFn })` → Promise de un objeto resultado:
  - `chat` → `{ reply: string, source: 'ai'|'fallback' }`
  - `profile` → `{ perfil, dictamen, cartera, source }`
  - `fraud` → `{ veredicto, motivo, source }`
  - Lógica: si falta `apiKey` o `body.intent` inválido → devuelve el fallback del intent. Si hay key, hace `fetchFn(url, opts)` a la REST de Gemini (`MODEL`), parsea `data.candidates[0].content.parts[0].text`. Para `chat` devuelve el texto como `reply`. Para `profile` parsea `PERFIL|just` (con `parsePipe`), normaliza el perfil a Capitalizado, adjunta `carteraFor(perfil)`. Para `fraud` parsea `VEREDICTO|motivo`. Cualquier excepción o respuesta no-ok → fallback del intent. `fetchFn` se inyecta para testear (default `fetch`).

- [ ] **Step 1: Escribir los tests que fallan**

```js
// tests/ai-core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAi } from '../netlify/functions/_lib/ai-core.js';

// fetch falso que devuelve un texto de Gemini dado
function fakeFetch(text, ok = true) {
  return async () => ({
    ok,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  });
}

test('chat sin apiKey usa fallback', async () => {
  const r = await handleAi({ body: { intent: 'chat', messages: [] }, apiKey: '', fetchFn: fakeFetch('x') });
  assert.equal(r.source, 'fallback');
  assert.ok(r.reply.length > 10);
});

test('chat con apiKey devuelve el texto de Gemini', async () => {
  const r = await handleAi({ body: { intent: 'chat', messages: [{ role: 'user', text: 'hola' }] }, apiKey: 'k', fetchFn: fakeFetch('Hola, soy tu tutor.') });
  assert.equal(r.source, 'ai');
  assert.equal(r.reply, 'Hola, soy tu tutor.');
});

test('profile con apiKey parsea PERFIL|justificación y adjunta cartera', async () => {
  const r = await handleAi({ body: { intent: 'profile', behavior: {}, portfolio: {} }, apiKey: 'k', fetchFn: fakeFetch('AGRESIVO|Toma mucho riesgo y FOMO.') });
  assert.equal(r.source, 'ai');
  assert.equal(r.perfil, 'Agresivo');
  assert.match(r.dictamen, /riesgo/);
  assert.ok(Array.isArray(r.cartera) && r.cartera.length >= 2);
});

test('fraud con apiKey parsea VEREDICTO|motivo', async () => {
  const r = await handleAi({ body: { intent: 'fraud', input: 'algo.com' }, apiKey: 'k', fetchFn: fakeFetch('SOSPECHOSO|Promete rendimientos garantizados.') });
  assert.equal(r.source, 'ai');
  assert.equal(r.veredicto, 'SOSPECHOSO');
  assert.match(r.motivo, /garantiz/);
});

test('si fetch tira error, cae al fallback del intent', async () => {
  const throwing = async () => { throw new Error('network'); };
  const r = await handleAi({ body: { intent: 'profile', behavior: { ventasEnBaja: 3 }, portfolio: {} }, apiKey: 'k', fetchFn: throwing });
  assert.equal(r.source, 'fallback');
  assert.equal(r.perfil, 'Conservador');
});

test('si la respuesta no es ok, cae al fallback', async () => {
  const r = await handleAi({ body: { intent: 'fraud', input: 'cocos' }, apiKey: 'k', fetchFn: fakeFetch('', false) });
  assert.equal(r.source, 'fallback');
  assert.equal(r.veredicto, 'PRECAUCIÓN');
});

test('intent desconocido cae a chat fallback', async () => {
  const r = await handleAi({ body: { intent: 'otro' }, apiKey: 'k', fetchFn: fakeFetch('x') });
  assert.equal(r.source, 'fallback');
  assert.ok(r.reply);
});
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npm test`
Expected: FALLA (no existe `ai-core.js`).

- [ ] **Step 3: Implementar `netlify/functions/_lib/ai-core.js`**

```js
// ai-core.js — orquesta la llamada a Gemini con fallback (fetch inyectable)
import { MODEL, buildRequestBody } from './prompts.js';
import { localProfile, fraudHeuristic, chatFallback, carteraFor, parsePipe } from './fallbacks.js';

const VALID = ['chat', 'profile', 'fraud'];

function fallbackFor(intent, body) {
  if (intent === 'profile') return localProfile(body.behavior, body.portfolio);
  if (intent === 'fraud') return fraudHeuristic(body.input);
  return { reply: chatFallback(), source: 'fallback' };
}

function normalizePerfil(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('conserv')) return 'Conservador';
  if (s.includes('agres')) return 'Agresivo';
  return 'Moderado';
}

export async function handleAi({ body = {}, apiKey, fetchFn = fetch }) {
  const intent = VALID.includes(body.intent) ? body.intent : 'chat';
  if (!apiKey || !VALID.includes(body.intent)) return fallbackFor(intent, body);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const reqBody = buildRequestBody(intent, body);
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    if (!res.ok) return fallbackFor(intent, body);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return fallbackFor(intent, body);

    if (intent === 'chat') return { reply: text.trim(), source: 'ai' };
    if (intent === 'profile') {
      const [rawPerfil, just] = parsePipe(text);
      const perfil = normalizePerfil(rawPerfil);
      return { perfil, dictamen: just || text.trim(), cartera: carteraFor(perfil), source: 'ai' };
    }
    // fraud
    const [veredicto, motivo] = parsePipe(text);
    return { veredicto: veredicto || 'PRECAUCIÓN', motivo: motivo || text.trim(), source: 'ai' };
  } catch {
    return fallbackFor(intent, body);
  }
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test`
Expected: PASAN los 7 tests de `ai-core.test.js`.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/_lib/ai-core.js tests/ai-core.test.js
git commit -m "feat(fase2): ai-core orquesta Gemini con fallback por intent (TDD)"
```

---

## Task 4: `netlify/functions/ai.js` — handler serverless (thin)

**Files:**
- Create: `netlify/functions/ai.js`

**Interfaces:**
- Consumes: `handleAi` (ai-core.js).
- Produces: el endpoint Netlify `POST /.netlify/functions/ai`. `export default async (request) => Response`. Lee `request.json()`, llama `handleAi({ body, apiKey: process.env.GEMINI_API_KEY, fetchFn: fetch })`, responde `new Response(JSON.stringify(result), { status:200, headers:{'Content-Type':'application/json'} })`. Si el método no es POST → 405. Si el JSON es inválido → trata el body como `{}` (caerá a fallback de chat).

- [ ] **Step 1: Implementar `netlify/functions/ai.js`**

```js
// ai.js — handler serverless de FINEDU (formato Web estándar de Netlify Functions)
import { handleAi } from './_lib/ai-core.js';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const result = await handleAi({ body, apiKey: process.env.GEMINI_API_KEY, fetchFn: fetch });
  return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
```

- [ ] **Step 2: Verificar que parsea**

Run: `node --check netlify/functions/ai.js`
Expected: sin salida (OK).

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/ai.js
git commit -m "feat(fase2): handler serverless ai.js (rutea por intent, key del lado servidor)"
```

---

## Task 5: `dev-server.js` — servidor local para front + función (sin netlify-cli)

**Files:**
- Create: `dev-server.js`
- Modify: `package.json` (script `dev`)

**Interfaces:**
- Consumes: `ai.js` (su `export default`).
- Produces: un servidor Node (solo `node:http`/`node:fs`/`node:path`/`node:url`) que sirve estáticamente `public/` y maneja `POST /.netlify/functions/ai` invocando el handler. Se corre con `node --env-file=.env dev-server.js` (Node v24 carga `.env` nativamente). Imprime la URL al arrancar.

- [ ] **Step 1: Implementar `dev-server.js`**

```js
// dev-server.js — SOLO DESARROLLO. Sirve public/ y ejecuta la función ai.js localmente.
// Uso: node --env-file=.env dev-server.js   (Node 20.6+/v24 carga .env nativo)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import aiHandler from './netlify/functions/ai.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const PORT = 8000;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  // Función de IA
  if (req.url.startsWith('/.netlify/functions/ai')) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request('http://local/.netlify/functions/ai', {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await aiHandler(request);
    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    res.end(await response.text());
    return;
  }
  // Estático
  let path = decodeURIComponent(req.url.split('?')[0]);
  if (path === '/') path = '/index.html';
  const filePath = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
});

server.listen(PORT, () => {
  const key = process.env.GEMINI_API_KEY;
  console.log(`FINEDU dev en http://localhost:${PORT}/`);
  console.log(key && key !== 'PEGA_TU_CLAVE_ACA' ? '✓ GEMINI_API_KEY cargada (IA real activa)' : '⚠ Sin GEMINI_API_KEY válida — la IA usará respuestas de respaldo (fallback)');
});
```

- [ ] **Step 2: Actualizar el script `dev` en `package.json`**

Reemplazar la línea `"dev": "netlify dev"` por:

```json
    "dev": "node --env-file=.env dev-server.js",
```

(Si no existe `.env`, Node falla; en ese caso usar `node dev-server.js` — documentado en el reporte.)

- [ ] **Step 3: Verificar que arranca y sirve**

Run: `node --check dev-server.js`
Expected: sin salida (OK).

(Arranque real con la key lo hace el humano; node --check confirma sintaxis.)

- [ ] **Step 4: Commit**

```bash
git add dev-server.js package.json
git commit -m "feat(fase2): dev-server local que ejecuta la funcion sin netlify-cli"
```

---

## Task 6: `public/js/api.js` — cliente para llamar la función

**Files:**
- Create: `public/js/api.js`

**Interfaces:**
- Consumes: nada.
- Produces: `callAI(intent, payload)` → Promise del objeto resultado (`{reply|perfil|veredicto, ..., source}`). POST a `/.netlify/functions/ai` con `{ intent, ...payload }`. Si la red falla, devuelve `{ source: 'error' }` (las vistas muestran su propio fallback de UI). `AI_ENDPOINT` exportado por si cambia.

- [ ] **Step 1: Implementar `public/js/api.js`**

```js
// api.js — cliente del backend de IA
export const AI_ENDPOINT = '/.netlify/functions/ai';

export async function callAI(intent, payload = {}) {
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, ...payload }),
    });
    if (!res.ok) return { source: 'error' };
    return await res.json();
  } catch {
    return { source: 'error' };
  }
}
```

- [ ] **Step 2: Verificar que parsea**

Run: `node --check public/js/api.js`
Expected: sin salida (OK).

- [ ] **Step 3: Commit**

```bash
git add public/js/api.js
git commit -m "feat(fase2): cliente api.js para el backend de IA"
```

---

## Task 7: `chat.js` — chat tutor real con contexto y skeleton

**Files:**
- Modify: `public/js/views/chat.js`

**Interfaces:**
- Consumes: `el` (ui.js); `callAI` (api.js); `store`.
- Produces: `mountChat({ store })` sigue devolviendo `{ toggle() }`, pero ahora: mantiene un historial de mensajes en memoria; al enviar, arma `context` desde el store (`cartera` = resumen de `wallet.portfolio` en `{ticker:cantidad}`, `ultimasOps` = derivado simple del estado, `pantalla` = de `location.hash`), llama `callAI('chat', { messages, context })`, muestra un **skeleton de "escribiendo…"** mientras espera, y agrega la respuesta. Si `source==='error'`, muestra el `chatFallback`-style local. El mensaje del usuario y el del bot se agregan al historial.

- [ ] **Step 1: Reescribir `public/js/views/chat.js`**

```js
// chat.js — panel flotante de Asesor IA (Fase 2: IA real con contexto)
import { el } from '../ui.js';
import { callAI } from '../api.js';

const OFFLINE = 'El Asesor IA está sin conexión por un momento. Tip de Graham: invertí con margen de seguridad y no operes por miedo o euforia. Probá de nuevo en un rato.';

export function mountChat({ store }) {
  const messages = []; // historial en memoria { role:'user'|'bot', text }
  const box = el('div', { id: 'chat-box', style: 'display:flex;flex-direction:column;gap:8px;' }, [
    el('div', { class: 'card', style: 'margin:0;background:var(--violet-soft);border-color:var(--violet-border);', text: '¡Hola! Soy tu Asesor IA. Preguntame sobre CEDEARs, ONs, balances o tus decisiones en el simulador.' }),
  ]);

  function addMsg(role, text) {
    const mine = role === 'user';
    box.appendChild(el('div', {
      class: 'card',
      style: `margin:0;${mine ? 'align-self:flex-end;background:var(--violet);color:#fff;' : 'background:#1a2140;'}`,
      text,
    }));
    box.scrollTop = box.scrollHeight;
  }

  function buildContext() {
    const pf = store.get('wallet.portfolio') || {};
    const cartera = {};
    Object.keys(pf).forEach((t) => { if (pf[t].cantidad > 0) cartera[t.split(' ')[0]] = pf[t].cantidad; });
    const b = store.get('behavior') || {};
    const ultimasOps = [];
    if (b.ventasEnBaja) ultimasOps.push(`${b.ventasEnBaja} ventas en baja`);
    if (b.comprasEnAlza) ultimasOps.push(`${b.comprasEnAlza} compras en alza`);
    const pantalla = (location.hash || '').replace(/^#\//, '') || 'inicio';
    return { cartera, ultimasOps, pantalla };
  }

  const input = el('input', { type: 'text', placeholder: 'Escribí tu consulta…', style: 'flex:1;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--navy);color:var(--fg);' });

  async function send() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg('user', text);
    messages.push({ role: 'user', text });

    // skeleton "escribiendo…"
    const typing = el('div', { class: 'card skeleton', style: 'margin:0;height:36px;width:60%;' });
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;

    const r = await callAI('chat', { messages, context: buildContext() });
    typing.remove();
    const reply = (r && r.source !== 'error' && r.reply) ? r.reply : OFFLINE;
    addMsg('bot', reply);
    messages.push({ role: 'bot', text: reply });
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  const panel = el('div', { id: 'ai-panel', style: 'display:none;position:fixed;right:16px;bottom:150px;z-index:42;width:min(360px,92vw);height:460px;background:var(--card-2);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow);flex-direction:column;overflow:hidden;' }, [
    el('div', { style: 'background:var(--violet);color:#fff;padding:12px 14px;font-weight:600;', text: '✦ Asesor IA' }),
    el('div', { style: 'flex:1;overflow-y:auto;padding:12px;' }, [box]),
    el('div', { style: 'display:flex;gap:6px;padding:10px;border-top:1px solid var(--border);' }, [input, el('button', { class: 'btn btn-ai', style: 'width:auto;margin:0;padding:0 14px;', text: '➤', onclick: send })]),
  ]);
  document.body.append(panel);
  return {
    toggle() { panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex'; },
  };
}
```

- [ ] **Step 2: Verificar parseo y tests**

Run: `node --check public/js/views/chat.js`
Expected: sin salida.

Run: `npm test`
Expected: 43/43 (22 base + 6 prompts + 8 fallbacks + 7 ai-core).

- [ ] **Step 3: Commit**

```bash
git add public/js/views/chat.js
git commit -m "feat(fase2): chat tutor real con contexto del usuario y skeleton"
```

---

## Task 8: `profile.js` — perfil de riesgo conductual (IA) + entradas

**Files:**
- Create: `public/js/views/profile.js`
- Modify: `public/js/app.js` (registrar ruta `profile`)
- Modify: `public/js/views/sim.js` (botón "Analizar mi perfil con IA" tras 3 turnos)

**Interfaces:**
- Consumes: `el`, `toast` (ui.js); `callAI` (api.js); `store`.
- Produces: `renderProfile(container, { store })` que lee `behavior` + `wallet.portfolio` del store, muestra un skeleton, llama `callAI('profile', { behavior, portfolio })`, y pinta: badge del perfil (color por perfil), dictamen, y la cartera sugerida (barras con porcentaje). Si `source==='error'`, usa una nota local. Ruta `profile` registrada en app.js. En `sim.js`, cuando `behavior.turnos >= 3`, se muestra un botón violeta "🤖 Analizar mi perfil con IA" que navega a `#/profile`.

- [ ] **Step 1: Crear `public/js/views/profile.js`**

```js
// profile.js — Perfil de riesgo conductual con IA
import { el } from '../ui.js';
import { callAI } from '../api.js';

const BADGE = { Conservador: 'var(--green)', Moderado: 'var(--gold)', Agresivo: 'var(--red)' };

export function renderProfile(container, { store }) {
  container.innerHTML = '';
  container.append(
    el('h2', { html: '✦ Perfil de riesgo <span style="color:var(--violet)">(IA)</span>', style: 'margin-bottom:6px;' }),
    el('p', { class: 'sub', text: 'Analizamos tus decisiones en el simulador para estimar tu tolerancia real al riesgo.', style: 'font-size:13px;margin-top:0;' }),
  );
  const slot = el('div', { class: 'card skeleton', style: 'height:140px;' });
  container.append(slot);
  const back = el('button', { class: 'btn btn-secondary', style: 'margin-top:8px;', text: 'Volver al simulador', onclick: () => { location.hash = '#/sim'; } });
  container.append(back);

  const behavior = store.get('behavior') || {};
  const portfolio = store.get('wallet.portfolio') || {};

  callAI('profile', { behavior, portfolio }).then((r) => {
    slot.classList.remove('skeleton');
    slot.style.height = 'auto';
    if (!r || r.source === 'error' || !r.perfil) {
      slot.append(el('p', { class: 'sub', text: 'No pudimos analizar tu perfil ahora. Operá unos turnos más y probá de nuevo.' }));
      return;
    }
    const color = BADGE[r.perfil] || 'var(--gold)';
    slot.append(
      el('div', { style: 'text-align:center;margin-bottom:10px;' }, [
        el('span', { class: 'sub', text: 'Tu perfil detectado', style: 'font-size:11px;display:block;margin-bottom:6px;' }),
        el('span', { text: r.perfil, style: `display:inline-block;padding:6px 16px;border-radius:12px;font-weight:800;background:color-mix(in srgb, ${color} 18%, transparent);color:${color};border:1px solid ${color};` }),
      ]),
      el('div', { style: 'font-size:13px;line-height:1.5;color:var(--fg);margin-bottom:12px;' }, [
        el('b', { text: '📌 Dictamen: ' }), el('span', { text: r.dictamen }),
      ]),
      el('div', { class: 'sub', text: 'Cartera sugerida (criterio Graham)', style: 'font-size:11px;font-weight:600;margin-bottom:6px;' }),
      ...(r.cartera || []).map((c) => el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px;' }, [
        el('span', {}, [el('span', { text: '● ', style: `color:var(${c.color});` }), el('span', { text: c.label })]),
        el('b', { class: 'tnum', text: c.pct + '%' }),
      ])),
    );
  });
}
```

- [ ] **Step 2: Registrar la ruta en `public/js/app.js`**

Agregar el import y reemplazar el placeholder de `profile`:

```js
import { renderProfile } from './views/profile.js';
// ...
  profile: (c) => renderProfile(c, { store }),
```

- [ ] **Step 3: Agregar el botón en `public/js/views/sim.js`**

En `renderList`, después de `turnoBadge` y antes de la pizarra, insertar (usando la variable `turn` ya leída):

```js
  // Acceso al perfil de riesgo IA tras 3 turnos
  const perfilBtn = (turn >= 3)
    ? el('button', { class: 'btn btn-ai', style: 'margin-bottom:10px;', text: '🤖 Analizar mi perfil con IA', onclick: () => { location.hash = '#/profile'; } })
    : null;
```

Y agregarlo al `container.append(...)` de `renderList` (incluir `perfilBtn` en la lista; `el()`/append ignoran `null`). Colocarlo justo después de `turnoBadge`.

- [ ] **Step 4: Verificar parseo y tests**

Run: `node --check public/js/views/profile.js public/js/app.js public/js/views/sim.js`
Expected: sin salida.

Run: `npm test`
Expected: 43/43 (sin cambios en tests).

- [ ] **Step 5: Commit**

```bash
git add public/js/views/profile.js public/js/app.js public/js/views/sim.js
git commit -m "feat(fase2): perfil de riesgo conductual con IA y acceso desde el simulador"
```

---

## Task 9: `fraud.js` — escudo anti-fraude + acceso desde el Inicio

**Files:**
- Create: `public/js/views/fraud.js`
- Modify: `public/js/app.js` (registrar ruta `fraud`)
- Modify: `public/js/views/home.js` (botón de acceso)

**Interfaces:**
- Consumes: `el`, `toast` (ui.js); `callAI` (api.js).
- Produces: `renderFraud(container)` con un input para pegar una URL/nombre/propuesta y un botón "Verificar". Llama `callAI('fraud', { input })`, muestra un skeleton mientras espera, y pinta un veredicto con color (SOSPECHOSO→rojo, PRECAUCIÓN→oro, PROBABLEMENTE_LEGÍTIMO→verde) + motivo + recordatorio CNV. Ruta `fraud` registrada en app.js. En `home.js`, un botón "🛡️ ¿Es seguro? Verificá una inversión" que navega a `#/fraud`.

- [ ] **Step 1: Crear `public/js/views/fraud.js`**

```js
// fraud.js — Escudo anti-fraude con IA
import { el, toast } from '../ui.js';
import { callAI } from '../api.js';

const COLOR = { 'SOSPECHOSO': 'var(--red)', 'PRECAUCIÓN': 'var(--gold)', 'PROBABLEMENTE_LEGÍTIMO': 'var(--green)' };

export function renderFraud(container) {
  container.innerHTML = '';
  const input = el('input', { type: 'text', placeholder: 'Pegá una URL, nombre de plataforma o propuesta…', style: 'width:100%;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--navy);color:var(--fg);margin-bottom:10px;' });
  const result = el('div', {});

  async function verificar() {
    const val = input.value.trim();
    if (!val) { toast('Pegá algo para verificar.'); return; }
    result.innerHTML = '';
    const slot = el('div', { class: 'card skeleton', style: 'height:90px;' });
    result.append(slot);
    const r = await callAI('fraud', { input: val });
    slot.classList.remove('skeleton'); slot.style.height = 'auto';
    if (!r || r.source === 'error' || !r.veredicto) {
      slot.append(el('p', { class: 'sub', text: 'No pudimos verificar ahora. Regla de oro: confirmá si la entidad está en el registro de la CNV (argentina.gob.ar/cnv).' }));
      return;
    }
    const color = COLOR[r.veredicto] || 'var(--gold)';
    slot.append(
      el('span', { text: r.veredicto.replace(/_/g, ' '), style: `display:inline-block;padding:5px 12px;border-radius:10px;font-weight:800;font-size:12px;background:color-mix(in srgb, ${color} 18%, transparent);color:${color};border:1px solid ${color};margin-bottom:8px;` }),
      el('p', { style: 'font-size:13px;line-height:1.5;color:var(--fg);margin:6px 0 0;', text: r.motivo }),
    );
  }

  container.append(
    el('h2', { html: '🛡️ Escudo anti-fraude <span style="color:var(--violet)">(IA)</span>', style: 'margin-bottom:6px;' }),
    el('p', { class: 'sub', text: 'Antes de invertir afuera, verificá señales de estafa. La IA te orienta; la palabra final la tiene el registro de la CNV.', style: 'font-size:13px;margin-top:0;' }),
    input,
    el('button', { class: 'btn btn-ai', text: 'Verificar', onclick: verificar }),
    result,
    el('button', { class: 'btn btn-secondary', style: 'margin-top:14px;', text: 'Volver al inicio', onclick: () => { location.hash = '#/home'; } }),
  );
}
```

- [ ] **Step 2: Registrar la ruta en `public/js/app.js`**

```js
import { renderFraud } from './views/fraud.js';
// ...
  fraud: (c) => renderFraud(c),
```

- [ ] **Step 3: Agregar el botón en `public/js/views/home.js`**

Después del botón de "Asesor IA" (el `btn-ai`), agregar otro acceso de IA:

```js
    el('button', { class: 'btn btn-ai', onclick: () => { location.hash = '#/fraud'; } }, [el('span', { text: '🛡️' }), el('span', { html: 'Escudo anti-fraude<small>Verificá si una inversión es segura</small>' })]),
```

(Insertarlo dentro del bloque `actions`, justo después del botón "Asesor IA".)

- [ ] **Step 4: Verificar parseo y tests**

Run: `node --check public/js/views/fraud.js public/js/app.js public/js/views/home.js`
Expected: sin salida.

Run: `npm test`
Expected: 43/43.

- [ ] **Step 5: Commit**

```bash
git add public/js/views/fraud.js public/js/app.js public/js/views/home.js
git commit -m "feat(fase2): escudo anti-fraude con IA y acceso desde el inicio"
```

---

## Task 10: Nudge de conducta en el simulador + verificación integral

**Files:**
- Modify: `public/js/views/sim.js` (nudge local de pánico/FOMO que abre el chat)

**Interfaces:**
- Consumes: lo existente de sim.js; el evento global `finedu:toggle-chat` (ya existe desde Fase 0, lo escucha app.js para abrir el chat).
- Produces: tras una operación detectada como pánico (venta con `delta < -5`) o FOMO (compra con `delta > 10`), se muestra una **tarjeta-nudge violeta** en el detalle del activo que invita a hablar con el Asesor IA; al tocarla dispara `window.dispatchEvent(new CustomEvent('finedu:toggle-chat'))`. La detección es **local** (no gasta llamadas a la IA); la conversación real ocurre en el chat.

- [ ] **Step 1: Agregar el nudge en `operar` de `public/js/views/sim.js`**

Dentro de `operar`, después de las ramas COMPRA/VENTA y antes de `renderDetail(...)`, fijar una bandera de nudge según el delta del activo:

```js
  // Nudge local de conducta (no llama a la IA; solo invita a conversar)
  if (accion === 'VENTA' && asset.delta < -5) nudge = { tipo: 'pánico', texto: 'Vendiste en plena baja. ¿Es una decisión por fundamentos o por miedo? Tu Asesor IA puede ayudarte a pensarlo.' };
  else if (accion === 'COMPRA' && asset.delta > 10) nudge = { tipo: 'FOMO', texto: 'Compraste en plena suba. Ojo con el FOMO. ¿Lo charlamos con tu Asesor IA?' };
  else nudge = null;
```

Declarar `let nudge = null;` a nivel de módulo (junto a `selectedTicker`) y, en `renderDetail`, si `nudge` no es null, insertar una tarjeta antes de los controles de cantidad:

```js
  if (nudge) {
    container.append(el('div', {
      class: 'card', style: 'background:var(--violet-soft);border-color:var(--violet-border);cursor:pointer;',
      onclick: () => { nudge = null; window.dispatchEvent(new CustomEvent('finedu:toggle-chat')); },
    }, [
      el('span', { text: '✦ ', style: 'color:var(--violet);font-weight:700;' }),
      el('span', { text: nudge.texto, style: 'font-size:12.5px;line-height:1.45;' }),
    ]));
  }
```

(Colocar este bloque dentro de `renderDetail`, después de `posCard` y antes del rótulo "Cantidad a operar".)

- [ ] **Step 2: Verificar parseo y tests**

Run: `node --check public/js/views/sim.js`
Expected: sin salida.

Run: `npm test`
Expected: 43/43.

- [ ] **Step 3: Checks estáticos finales**

Confirmar (búsquedas):
- En `public/js/` no quedan llamadas a `alert(`/`confirm(` nativas nuevas (usar `toast`/`confirmModal`).
- La API key (`GEMINI_API_KEY`) NO aparece en ningún archivo de `public/` (solo se usa en `netlify/functions/ai.js` vía `process.env`). Buscar también que no quede ninguna key hardcodeada (`AQ.`, `AIza`).
- `node --check` sobre todos los nuevos: `netlify/functions/ai.js public/js/api.js public/js/views/chat.js public/js/views/profile.js public/js/views/fraud.js`.

Reportar resultados.

- [ ] **Step 4: Recorrido manual (lo corre el humano)**

Con la key pegada en `.env`, correr `npm run dev` (o `node --env-file=.env dev-server.js`) y en `http://localhost:8000/`:
- **Chat (FAB ✦):** preguntar algo (ej. "¿qué es un CEDEAR?") → responde la IA real; tras unas operaciones, preguntar "¿cómo vengo operando?" → comenta la conducta.
- **Perfil:** operar ≥3 turnos en el simulador → aparece "🤖 Analizar mi perfil con IA" → muestra perfil + dictamen + cartera.
- **Anti-fraude:** desde Inicio, "🛡️ Escudo anti-fraude" → pegar "duplicá tu dinero sin riesgo" → SOSPECHOSO; pegar "cocos capital" → PRECAUCIÓN.
- **Nudge:** vender un activo en baja fuerte → aparece la tarjeta violeta que abre el chat.
- **Fallback:** vaciar/poner inválida la key en `.env`, reiniciar → todo sigue respondiendo con respaldos (chat tip, perfil heurístico, anti-fraude heurístico). La demo no se rompe.
- Las otras pantallas siguen andando.

- [ ] **Step 5: Commit**

```bash
git add public/js/views/sim.js
git commit -m "feat(fase2): nudge local de panico/FOMO que invita a hablar con el Asesor IA"
```

---

## Self-Review (cobertura del spec — Pilar 2 + extras IA)

- **Chat IA real "maestro y garante" con contexto** → Task 1 (prompt chat) + Task 3 (handleAi) + Task 7 (vista con contexto del store). ✓
- **Perfil de riesgo conductual + cartera Graham** → Task 1 (prompt profile) + Task 2 (localProfile/carteraFor) + Task 3 (parseo) + Task 8 (vista + acceso desde sim). ✓
- **Escudo anti-fraude (URL/entidad → CNV)** → Task 1 (prompt fraud) + Task 2 (fraudHeuristic) + Task 3 + Task 9 (vista + acceso desde inicio). ✓
- **Backend con key protegida (Netlify Function + env var)** → Task 4 (ai.js usa process.env) + `.env` gitignored + Task 5 (dev local). ✓
- **Fallback para que la demo no se rompa** → Task 2 (cerebro offline) + Task 3 (cae a fallback ante error/sin key) + cada vista maneja `source:'error'`. ✓
- **Nudges proactivos de conducta** → Task 10 (detección local + invitación al chat). ✓
- **Una sola función con intents** → Task 4 (`ai.js` rutea chat/profile/fraud). ✓
- **Seguridad: la key nunca en el front** → verificado en Task 10 Step 3. ✓
- **Fuera de alcance (correcto):** verificación en vivo contra base CNV (la IA da chequeo razonado, no datos en vivo); Supabase/auth/social (Fase 3); deploy productivo a Netlify (se hace cuando el equipo conecte la env var en el panel — queda documentado, no es código de esta fase).

**Nota de granularidad:** la lógica del cerebro (prompts, fallbacks, parseo/orquestación) está cubierta por tests (Tasks 1-3). El handler, el dev-server y las vistas se validan con `node --check` + recorrido manual (el proyecto no tiene framework de test de DOM/red, por decisión de Fase 0). Las vistas chat/profile/fraud traen código completo en el plan.
