import { el } from '../ui.js';

const STUB_REPLY = 'En esta versión el asistente todavía es de muestra. En la próxima entrega va a poder responderte de verdad sobre tu cartera, balances y activos.';

export function mountChat({ store }) {
  const box = el('div', { id: 'chat-box', style: 'display:flex;flex-direction:column;gap:8px;' }, [
    el('div', { class: 'card', style: 'margin:0;', text: '¡Hola! Soy tu Asesor IA. (Versión de muestra por ahora.)' }),
  ]);
  const input = el('input', { type: 'text', placeholder: 'Escribí tu consulta…', style: 'flex:1;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--navy);color:var(--fg);' });
  const send = () => {
    const t = input.value.trim(); if (!t) return;
    box.append(el('div', { class: 'card', style: 'margin:0;align-self:flex-end;background:var(--violet-soft);border-color:var(--violet-border);', text: t }));
    input.value = '';
    setTimeout(() => box.append(el('div', { class: 'card', style: 'margin:0;', text: STUB_REPLY })), 500);
    box.scrollTop = box.scrollHeight;
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  const panel = el('div', { id: 'ai-panel', style: 'display:none;position:fixed;right:16px;bottom:150px;z-index:42;width:min(360px,92vw);height:440px;background:var(--card-2);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow);flex-direction:column;overflow:hidden;' }, [
    el('div', { style: 'background:var(--violet);color:#fff;padding:12px 14px;font-weight:600;', text: '✦ Asesor IA' }),
    el('div', { style: 'flex:1;overflow-y:auto;padding:12px;', }, [box]),
    el('div', { style: 'display:flex;gap:6px;padding:10px;border-top:1px solid var(--border);' }, [input, el('button', { class: 'btn btn-ai', style: 'width:auto;margin:0;padding:0 14px;', text: '➤', onclick: send })]),
  ]);
  document.body.append(panel);
  return {
    toggle() {
      const open = panel.style.display === 'flex';
      panel.style.display = open ? 'none' : 'flex';
    },
  };
}
