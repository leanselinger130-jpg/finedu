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
      style: `margin:0;${mine ? 'align-self:flex-end;background:var(--violet);color:#fff;' : 'background:var(--chat-bot);'}`,
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
