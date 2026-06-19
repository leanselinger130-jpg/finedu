// chart.js — gráficos SVG hechos a mano (sin librerías)
import { el } from './ui.js';

const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function seriesToPoints(series, width, height, pad = 2) {
  if (!Array.isArray(series) || series.length < 2) return '';
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return series.map((v, i) => {
    const x = pad + (innerW * i) / (series.length - 1);
    const y = span === 0
      ? pad + innerH / 2
      : pad + innerH * (1 - (v - min) / span);
    return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
  }).join(' ');
}

export function renderSparkline(series, { width = 56, height = 20, color = 'var(--green)' } = {}) {
  const svg = svgEl('svg', { width, height, viewBox: `0 0 ${width} ${height}` });
  const pts = seriesToPoints(series, width, height);
  if (pts) {
    svg.appendChild(svgEl('polyline', {
      points: pts, fill: 'none', stroke: color, 'stroke-width': '1.5',
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
  }
  return svg;
}

export function renderLineChart(series, { width = 300, height = 120, color = 'var(--gold)' } = {}) {
  if (!Array.isArray(series) || series.length < 2) {
    return el('div', { class: 'sub center', text: 'Sin datos suficientes todavía.', style: 'padding:24px 0;font-size:12px;' });
  }
  const pad = 8;
  const pts = seriesToPoints(series, width, height, pad);
  const svg = svgEl('svg', { width: '100%', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', style: 'display:block;' });
  // área tenue
  const firstX = pad, lastX = width - pad;
  const area = svgEl('polygon', {
    points: `${firstX},${height - pad} ${pts} ${lastX},${height - pad}`,
    fill: color, opacity: '0.12',
  });
  const line = svgEl('polyline', {
    points: pts, fill: 'none', stroke: color, 'stroke-width': '2',
    'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  });
  svg.append(area, line);
  return svg;
}
