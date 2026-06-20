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
