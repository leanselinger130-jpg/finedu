// onboarding.js — bievenida de 3 pantallas, saltable
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
