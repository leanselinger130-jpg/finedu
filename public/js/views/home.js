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
