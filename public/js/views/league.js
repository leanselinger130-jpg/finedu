// league.js — Vista Liga / Leaderboard (Fase 0 port del MVP app-tisi.html ~líneas 724–742)
//
// Seeded rivals (rivales sembrados) + usuario actual, ordenados por XP descendente.
// El XP del usuario se obtiene de store.get('progress.xp').
// La fila del usuario se resalta con un estilo dorado (consistent con el color de usuario del dark theme).
//
// Nota: Este es un leaderboard local/sembrado. La integración real con Supabase llega en Fase 3.

import { el, clear, toast } from '../ui.js';
import { ACHIEVEMENTS } from '../achievements.js';
import { buildChallengeLink } from '../challenge.js';

// ─── Rivales sembrados (constante local) ────────────────────────────────────
const RIVALS = [
  { nombre: 'Santi_Inversiones', xp: 250 },
  { nombre: 'Flor.Finanzas', xp: 180 },
];

// ─── Punto de entrada ────────────────────────────────────────────────────────
export function renderLeague(container, { store }) {
  clear(container);

  // Obtener XP del usuario desde el store
  const userXp = store.get('progress.xp') || 0;

  // Armar la entrada del usuario
  const userEntry = { nombre: 'Vos', xp: userXp, isUser: true };

  // Combinar rivales + usuario
  const listaOrdenada = [...RIVALS, userEntry].sort((a, b) => b.xp - a.xp);

  // Encabezado
  const header = el('h2', { text: '🏆 Liga', style: 'margin-bottom:6px;' });
  const subtitle = el('p', { class: 'sub', style: 'font-size:13px;margin-bottom:18px;', text: 'Ranking de jugadores por XP acumulado.' });

  // Tabla
  const table = el('table', { style: 'width:100%;border-collapse:collapse;margin-bottom:18px;' }, [
    el('thead', {}, [
      el('tr', { style: 'border-bottom:1px solid var(--border);' }, [
        el('th', { style: 'text-align:left;padding:12px 8px;font-weight:600;font-size:12px;color:var(--sub);', text: 'Rank' }),
        el('th', { style: 'text-align:left;padding:12px 8px;font-weight:600;font-size:12px;color:var(--sub);', text: 'Jugador' }),
        el('th', { style: 'text-align:right;padding:12px 8px;font-weight:600;font-size:12px;color:var(--sub);', text: 'XP' }),
      ]),
    ]),
    el('tbody', {}, listaOrdenada.map((jugador, index) => {
      // Resaltar fila del usuario con un fondo dorado sutil
      const rowStyle = jugador.isUser
        ? 'background:rgba(245,158,11,.12);border-left:3px solid var(--gold);'
        : '';

      return el('tr', { style: `${rowStyle}border-bottom:1px solid var(--border);` }, [
        el('td', { style: 'padding:12px 8px;font-weight:600;color:var(--sub);', text: String(index + 1) }),
        el('td', { style: 'padding:12px 8px;color:var(--fg);', text: jugador.nombre }),
        el('td', { class: 'tnum', style: 'text-align:right;padding:12px 8px;color:var(--gold);font-weight:600;', text: `${jugador.xp} XP` }),
      ]);
    })),
  ]);

  // Medallas ganadas
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

  // Botón "Desafiar a un amigo"
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

  // Botón de regreso
  const backBtn = el('button', {
    class: 'btn btn-ghost',
    text: '← Volver a inicio',
    onclick: () => { location.hash = '#/home'; },
  });

  // Envolver contenido en .card
  const card = el('div', { class: 'card' }, [header, subtitle, table, medallas, desafiarBtn, backBtn]);
  container.append(card);
}
