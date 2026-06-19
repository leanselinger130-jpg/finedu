# FINEDU v2 — Documento de diseño

**Proyecto:** FINEDU — Finanzas Educativas (TISI 2026, Grupo 4, FCE UNLP)
**Fecha:** 2026-06-19
**Estado:** Aprobado para planificación

---

## 1. Contexto y objetivo

FINEDU es una plataforma **B2B de marca blanca** que los brokers/ALyCs (Cocos, Balanz, IOL)
integran para convertir *cuentas dormidas* en usuarios activos. Tiene dos audiencias:

- **Inversor minorista novato (B2C):** aprende sin riesgo, pierde el miedo y gana confianza
  antes de operar en el mercado real.
- **Broker (B2B, el pagador):** reduce costos de soporte y aumenta retención/comisiones.

La **IA es constitutiva** del producto, no un extra: tutor 24/7, perfil de riesgo conductual,
escudo anti-fraude y adaptación pedagógica.

### Problema de la versión actual (MVP)
El MVP es un único archivo HTML de ~848 líneas. La validación de la Entrega 2 mostró:
- Simulador percibido como "demasiado básico" → **frustración #1**.
- La IA es lo que **todos** los usuarios esperaban, pero el chat actual es falso (mensaje fijo).
- La viralidad no se materializó → necesita mecánicas de competencia incentivada.
- Conversión al broker baja por desconfianza → no hay que empujar al usuario tan rápido afuera.

### Objetivo de v2
Convertir el prototipo en un producto **vendible**: UX de calidad, funcionalidades que andan
de verdad, IA real, login real y social real, manteniendo el deploy simple y la demo robusta.

---

## 2. Identidad visual (cerrada)

- **Tipografía:** IBM Plex Sans (única), con dígitos tabulares (`tabular-nums`) para cifras.
  Sin monoespaciado. Elegida por su perfil "financial trust / institucional".
- **Modo principal:** oscuro (claro como soporte futuro).
- **Paleta:**
  | Rol | Hex |
  |---|---|
  | Fondo (navy) | `#0F172A` |
  | Card | `#222735` |
  | Borde | `#334155` |
  | Texto | `#F8FAFC` |
  | Texto atenuado | `#94A3B8` |
  | **Oro (dinero/primario)** | `#F59E0B` |
  | **Violeta (solo IA)** | `#8B5CF6` |
  | Verde (ganancia) | `#34D399` |
  | Rojo (pérdida) | `#F87171` |
- **Reglas de marca:**
  - El **oro** marca el dinero/acciones primarias. El **violeta** se reserva *exclusivamente*
    para momentos de IA (la IA es un "personaje", no un gradiente decorativo).
  - Sello "Entidad CNV verificada" como señal de confianza.
  - Iconografía SVG (no emojis como íconos estructurales en la versión final).
  - Anti-patrón explícito a evitar: gradientes violeta/rosa genéricos de "IA".

---

## 3. Arquitectura

**Opción elegida:** Vanilla JS modular, sin build (sin React/Vite), front estático en Netlify
+ Supabase para datos/auth + una Netlify Function como proxy de IA.

```
Front estático (Netlify)
  public/
    index.html                    shell + <nav> inferior
    css/   tokens.css  base.css  components.css
    js/    store.js   auth.js   router.js   sim.js   quiz.js
           chat.js    social.js dashboard.js ui.js   api.js
Backend
  netlify/functions/ai.js         proxy a Gemini, intents: chat | profile | fraud
  netlify/functions/prompts.js    system-prompts separados y editables
  Supabase                        auth (Google/email) + base de datos (Postgres + RLS)
Config
  netlify.toml
  Env vars: GEMINI_API_KEY · SUPABASE_URL · SUPABASE_ANON_KEY
```

**Justificación:** equipo no-dev + prioridad de demo robusta → sin toolchain que se rompa.
Cada módulo tiene una responsabilidad única (el `index.html` actual hace todo a la vez; eso se
descompone). Deploy por GitHub conectado a Netlify (CI/CD: cada push redespliega).

### Despliegue
- Repo en GitHub conectado a Netlify → deploy automático en cada `git push`.
- Env vars cargadas una vez en el panel de Netlify.
- Local: `netlify dev` (corre front + functions en Windows).

### Seguridad
- **Quitar y rotar** la API key de Gemini hoy hardcodeada en el código
  (`app-tisi.html`, ~línea 559). Ya quedó comprometida en el historial de git.
- La key vive solo como env var del lado servidor; el front nunca la ve.
- RLS en Supabase: cada usuario lee/escribe solo sus filas; la liga expone solo nombre + XP.

---

## 4. Navegación y embudo

**Barra de navegación inferior fija (4 ítems), mobile-first:**
```
🏠 Inicio   ·   📈 Simulador   ·   🧠 Aprender   ·   🏆 Liga
```
- **Asesor IA**: botón flotante (✦ violeta) accesible desde cualquier pantalla (es el pilar).
- **Dashboard del broker**: fuera de la navegación del usuario. Acceso discreto al pie del
  Inicio ("¿Sos un broker? → Panel de aliado") → pantalla de "acceso aliado" simulada
  (logo broker + "Entrar al panel") → dashboard. Narrativa B2B para la defensa.

**Embudo de conversión (invertido respecto del MVP):**
```
Practicar (sim) → Aprender (quiz) → Ganar confianza (la IA valida)
      → recién ahí se DESBLOQUEA "Estás listo para operar →" hacia el broker
```
El CTA al broker se desbloquea cuando el usuario demostró criterio (p. ej. completó N turnos de
simulador + un nivel de quiz). El clic deja de ser por curiosidad y pasa a ser por confianza —
el pivote "generación de confianza como servicio" de la Entrega 2.

---

## 5. Los 4 pilares + extras

### Pilar 1 — Simulador realista
- **Gráficos de precio:** cada activo guarda historial → mini-gráfico en la lista + gráfico
  grande en la vista de detalle del activo (al tocar un ticker).
- **Compra/venta por monto o cantidad**, con botones rápidos (25% / 50% / 100% del efectivo).
- **Vista de detalle del activo:** gráfico + descripción + posición + comprar/vender.
- **"Avanzar tiempo":** evoluciona precios con noticias macro + variación realista; guarda el
  **valor del portafolio en el tiempo** → gráfico "tu rendimiento".
- **P&L claro:** rendimiento total %, ganancia/pérdida en $, comparado contra benchmark.
- Instrumentos reales argentinos (CEDEARs, ONs, ETFs).

### Pilar 2 — Chat IA real ("maestro y garante")
- Función `ai.js` (intent `chat`) → Gemini con system-prompt de tutor financiero (criterio
  Graham, contexto argentino, lenguaje claro sin jerga; **educa, no da consejos de inversión
  reales**).
- **Contexto:** se le pasa la cartera y las últimas operaciones del usuario → puede comentar la
  conducta ("vendiste VIST en pánico, ¿lo analizamos?").
- **Nudges proactivos:** la IA salta con un tip en el simulador cuando detecta pánico/FOMO.
- **Fallback:** si Gemini falla o no hay cuota, responde con mensajes pre-cargados útiles.

### Pilar 3 — Competencia / viralidad incentivada
- **Liga semanal** con XP (de quiz + simulador). Con Supabase, rivales **reales**; en modo
  invitado, rivales sembrados.
- **Racha diaria** (streak) y **logros/medallas** (primer perfil IA, diversificar cartera,
  completar nivel, etc.).
- **Desafío por link:** se genera un link que codifica el puntaje → el amigo lo abre, ve la
  marca e intenta superarla. Funciona aun sin cuenta (score en el querystring); con cuenta se
  registra el desafío.

### Pilar 4 — Rediseño UX (transversal)
- Sistema visual aplicado a todas las pantallas.
- **Reemplazar `alert()`/`confirm()`** por toasts y modales in-app.
- Feedback de quiz integrado; animaciones 150–300ms; respeta `prefers-reduced-motion`.
- **Skeletons de carga** (sobre todo cuando piensa la IA).
- Mobile-first; touch targets ≥44px; estados hover/active/disabled claros.

### Extras (todos dentro del alcance)
- **Escudo anti-fraude IA** (intent `fraud`): el usuario pega una URL/entidad y la IA razona si
  parece legítima y lo deriva a verificar contra el registro oficial de la CNV. (La verificación
  en vivo contra base CNV queda fuera; la IA da un chequeo razonado, no datos en tiempo real.)
- **Perfil de riesgo IA mejorado** (intent `profile`): migra la lógica existente al backend
  seguro; analiza la conducta y sugiere cartera con criterio Graham.
- **Demo marca blanca:** toggle que re-skinea la app con logo/color de un broker (Cocos/Balanz)
  para mostrar el modelo B2B en la defensa.
- **Onboarding corto saltable:** 3 pantallas de propuesta de valor al primer ingreso.

---

## 6. Modelo de datos

**Store local (modo invitado / offline), única fuente de verdad en el cliente:**
```
usuario      email, fecha de alta
billetera    efectivo, cartera {ticker:{cant, costoProm}}, historial de valor
mercado      activos, historial de precios, turno, noticia actual
progreso     XP, racha, lastActiveDate, niveles de quiz hechos, logros
conducta     comprasEnAlza, ventasEnBaja, turnos  (para el perfil IA)
metricas     clicks broker (sim/quiz), mails, compartidos, IA vs humano
ajustes      tema, broker_skin
```
- `store.js` lee/guarda en localStorage con **número de versión de esquema** (migraciones).
- Arregla el bug actual: hoy se pierden XP y métricas al recargar.

**Supabase (cuando hay login):**
- `profiles` (id = auth uid, email, nombre, broker_skin)
- `game_state` (user_id, jsonb con billetera/cartera/progreso/conducta) — un registro por usuario
- `xp` como columna en `profiles` (denormalizada desde `game_state`) → ordenar la liga eficientemente
- `events` (user_id, tipo, ts) → métricas reales del dashboard del broker
- **Liga:** vista/consulta ordenada por `xp`, expone solo nombre + XP
- **Migración invitado→cuenta:** al registrarse, el estado local se sube a `game_state`.

---

## 7. Backend de IA

Una sola Netlify Function `ai.js` con ruteo por `intent`:

```
POST /.netlify/functions/ai
  { intent: "chat",    messages, context:{cartera, ultimasOps, pantalla} }
  { intent: "profile", behavior, portfolio }
  { intent: "fraud",   url|entidad }
```
- System-prompts en `prompts.js`, separados y editables.
- Cada intent tiene **try/catch con fallback**: respuesta pre-cargada útil si Gemini falla.
- La key (`GEMINI_API_KEY`) solo en el servidor.

---

## 8. Plan de fases

Cada fase queda demostrable y se puede mergear de forma independiente.

| Fase | Incluye | Resultado |
|---|---|---|
| **0 · Fundaciones** | Reestructura a módulos, sistema visual (tokens/css), `store.js` (invitado), router + nav inferior, pantallas migradas al skin nuevo | Mismo producto, look nuevo, ordenado |
| **1 · Simulador** | Motor de precios + historial + gráficos, detalle de activo, compra/venta por monto, P&L, rendimiento en el tiempo | El sim deja de ser "básico" |
| **2 · IA real** | Función `ai.js` + fallback, chat maestro/garante, nudges, perfil de riesgo, escudo anti-fraude | El pilar IA funcionando |
| **3 · Social + cuentas** | Supabase + auth (invitado→cuenta), sync, liga real, racha, logros, desafío por link | Login real + viralidad |
| **4 · B2B + pulido** | Dashboard del broker con métricas reales, marca blanca, acceso aliado, onboarding, toasts/animaciones, QA responsive | Listo para vender/defender |

---

## 9. Testing y robustez de demo

- **Tests de lógica pura** con el runner nativo de Node (`node:test`, sin dependencias):
  motor de precios, cálculo de P&L/rendimiento, scoring del perfil, XP/racha,
  encode/decode del link de desafío.
- **Checklist de QA manual** por fase.
- **IA con fallback + modo invitado** → la demo no depende de la red ni de cuotas.
- **Gotcha Supabase:** el tier gratis se "duerme" tras ~1 semana de inactividad; entrar una vez
  antes de la demo para despertarlo.
- `netlify dev` para correr front + functions en local.

---

## 10. Fuera de alcance (roadmap futuro)

- Integración transaccional real con brokers (la métrica de éxito es la intención de clic).
- Verificación anti-fraude contra base CNV en vivo (la IA da chequeo razonado, no datos en vivo).
- Modo claro como cara principal (queda como soporte).
- App nativa (el producto es web responsive).
