import { el } from '../ui.js';
export function renderHome(container) {
  container.append(el('h1', { text: 'FINEDU' }), el('p', { class: 'sub', text: 'Inicio (placeholder)' }));
}
