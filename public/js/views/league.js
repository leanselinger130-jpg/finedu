// league.js — Vista Liga / Leaderboard (Fase 0 port del MVP app-tisi.html ~líneas 724–742)
//
// Seeded rivals (rivales sembrados) + usuario actual, ordenados por XP descendente.
// El XP del usuario se obtiene de store.get('progress.xp').
// La fila del usuario se resalta con un estilo dorado (consistent con el color de usuario del dark theme).
//
// Nota: Este es un leaderboard local/sembrado. La integración real con Supabase llega en Fase 3.

import { el } from '../ui.js';

// ─── Rivales sembrados (constante local) ────────────────────────────────────
const RIVALS = [
  { nombre: 'Santi_Inversiones', xp: 250 },
  { nombre: 'Flor.Finanzas', xp: 180 },
];

// ─── Punto de entrada ────────────────────────────────────────────────────────
export function renderLeague(container, { store }) {
  container.innerHTML = '';

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

  // Botón de regreso
  const backBtn = el('button', {
    class: 'btn btn-ghost',
    text: '← Volver a inicio',
    onclick: () => { location.hash = '#/home'; },
  });

  container.append(header, subtitle, table, backBtn);
}
