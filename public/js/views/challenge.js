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
