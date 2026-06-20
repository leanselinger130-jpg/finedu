// fraud.js — Escudo anti-fraude con IA
import { el, toast } from '../ui.js';
import { callAI } from '../api.js';

const COLOR = { 'SOSPECHOSO': 'var(--red)', 'PRECAUCIÓN': 'var(--gold)', 'PROBABLEMENTE_LEGÍTIMO': 'var(--green)' };

export function renderFraud(container) {
  container.innerHTML = '';
  const input = el('input', { type: 'text', placeholder: 'Pegá una URL, nombre de plataforma o propuesta…', style: 'width:100%;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--navy);color:var(--fg);margin-bottom:10px;' });
  const result = el('div', {});

  async function verificar() {
    const val = input.value.trim();
    if (!val) { toast('Pegá algo para verificar.'); return; }
    result.innerHTML = '';
    const slot = el('div', { class: 'card skeleton', style: 'height:90px;' });
    result.append(slot);
    const r = await callAI('fraud', { input: val });
    slot.classList.remove('skeleton'); slot.style.height = 'auto';
    if (!r || r.source === 'error' || !r.veredicto) {
      slot.append(el('p', { class: 'sub', text: 'No pudimos verificar ahora. Regla de oro: confirmá si la entidad está en el registro de la CNV (argentina.gob.ar/cnv).' }));
      return;
    }
    const color = COLOR[r.veredicto] || 'var(--gold)';
    slot.append(
      el('span', { text: r.veredicto.replace(/_/g, ' '), style: `display:inline-block;padding:5px 12px;border-radius:10px;font-weight:800;font-size:12px;background:color-mix(in srgb, ${color} 18%, transparent);color:${color};border:1px solid ${color};margin-bottom:8px;` }),
      el('p', { style: 'font-size:13px;line-height:1.5;color:var(--fg);margin:6px 0 0;', text: r.motivo }),
    );
  }

  container.append(
    el('h2', { html: '🛡️ Escudo anti-fraude <span style="color:var(--violet)">(IA)</span>', style: 'margin-bottom:6px;' }),
    el('p', { class: 'sub', text: 'Antes de invertir afuera, verificá señales de estafa. La IA te orienta; la palabra final la tiene el registro de la CNV.', style: 'font-size:13px;margin-top:0;' }),
    input,
    el('button', { class: 'btn btn-ai', text: 'Verificar', onclick: verificar }),
    result,
    el('button', { class: 'btn btn-secondary', style: 'margin-top:14px;', text: 'Volver al inicio', onclick: () => { location.hash = '#/home'; } }),
  );
}
