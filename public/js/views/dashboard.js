// dashboard.js — Vista Dashboard del broker (Fase 0 port del MVP app-tisi.html líneas 300–335 y 747–760)
//
// Muestra métricas de conversión del broker: clicks en sim/quiz, mails capturados,
// compartidos y la barra de preferencia IA vs Humano.
// Encabezado "Panel de aliado" para la narrativa B2B (accedido desde el link "¿Sos un broker?" en Inicio).
//
// Nota: la vista es de solo lectura (snapshot al momento del render).
// Verificación en browser diferida.

import { el, clear } from '../ui.js';
import { BROKERS } from '../data/brokers.js';
import { applySkin } from '../theme.js';

// ─── Punto de entrada ────────────────────────────────────────────────────────
export function renderDashboard(container, { store }) {
  clear(container);

  const metrics = store.get('metrics') || {};
  const { brokerSim = 0, brokerQuiz = 0, mails = 0, shared = 0, ia = 0, hum = 0 } = metrics;

  // Barra IA vs Humano — fórmula del MVP: 50% neutral cuando no hay datos
  const totalAsesor = ia + hum;
  const pctIa = totalAsesor > 0 ? (ia / totalAsesor) * 100 : 50;

  // ── Encabezado "Panel de aliado" (narrativa B2B) ──────────────────────────
  const headerCard = el('div', { class: 'card', style: 'margin-bottom:12px;' }, [
    el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:4px;' }, [
      el('span', { style: 'font-size:20px;', text: '🤝' }),
      el('h2', { text: 'Panel de aliado', style: 'margin:0;font-size:18px;' }),
    ]),
    el('p', { class: 'sub', style: 'font-size:12px;margin:0;', text: 'Vista de demostración para el broker · FINEDU v2' }),
  ]);

  // ── Grilla de métricas (2 columnas) ──────────────────────────────────────
  const metricsGrid = el('div', {
    style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;',
  }, [
    metricTile('Clicks Broker (Sim)', brokerSim, false),
    metricTile('Clicks Broker (Quiz)', brokerQuiz, false),
    metricTile('Mails capturados', mails, false),
    metricTile('Compartido', shared, false),
  ]);

  // ── Barra IA vs Humano ────────────────────────────────────────────────────
  const iaBar = el('div', { class: 'card', style: 'margin-bottom:12px;' }, [
    el('div', { class: 'sub', style: 'font-size:11px;font-weight:600;margin-bottom:10px;letter-spacing:.05em;', text: 'Preferencia de Asesoría' }),
    el('div', { style: 'background:var(--border);border-radius:99px;height:10px;overflow:hidden;margin-bottom:8px;' }, [
      el('div', {
        style: `width:${pctIa.toFixed(1)}%;height:100%;background:var(--violet,#7c3aed);border-radius:99px;transition:width .4s ease;`,
      }),
    ]),
    el('div', { style: 'display:flex;justify-content:space-between;font-size:12px;color:var(--sub);' }, [
      el('span', { text: `🤖 IA: ${ia}` }),
      el('span', { text: `👨‍💼 Humano: ${hum}` }),
    ]),
  ]);

  // ── Selector de marca blanca ─────────────────────────────────────────────
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

  // ── Botón de regreso ──────────────────────────────────────────────────────
  const backBtn = el('button', {
    class: 'btn btn-ghost',
    text: '← Volver al Inicio',
    onclick: () => { location.hash = '#/home'; },
  });

  container.append(headerCard, metricsGrid, iaBar, skinCard, backBtn);
}

// ─── Helper: tile de métrica individual ──────────────────────────────────────
function metricTile(label, value, isIa) {
  const valueColor = isIa ? 'color:var(--violet,#7c3aed);' : 'color:var(--gold);';
  return el('div', { class: 'card', style: 'text-align:center;padding:14px 10px;' }, [
    el('div', { class: 'sub', style: 'font-size:11px;font-weight:500;margin-bottom:6px;', text: label }),
    el('div', { class: 'tnum', style: `font-size:28px;font-weight:700;${valueColor}`, text: String(value) }),
  ]);
}
