// sim.js — Vista Simulador (Fase 1: precios persistidos, gráficos, detalle, P&L)
import { el, toast } from '../ui.js';
import { ASSETS, NEWS } from '../data/market.js';
import {
  applyNewsImpact, portfolioValue, positionReturnPct,
  totalReturnPct, benchmarkReturnPct, quickAmountQty,
} from '../sim-engine.js';
import { renderSparkline, renderLineChart } from '../chart.js';

const BENCHMARK = 'SPY (S&P 500)';

// Estado de navegación interno de la vista (lista vs detalle). No es una ruta.
let selectedTicker = null;

// --- Helpers de estado de mercado en el store ---
function getPrices(store) {
  let prices = store.get('market.prices');
  if (!prices || prices.length === 0) {
    prices = ASSETS.map((a) => ({ ...a }));
    store.set('market.prices', prices);
    // Sembrar el historial con el precio inicial de cada activo
    const hist = {};
    prices.forEach((a) => { hist[a.ticker] = [a.precio]; });
    store.set('market.priceHistory', hist);
  }
  return prices;
}

export function renderSim(container, { store }) {
  if (selectedTicker) { renderDetail(container, store, selectedTicker); return; }
  renderList(container, store);
}

function renderList(container, store) {
  const prices = getPrices(store);
  const cash = store.get('wallet.cash');
  const portfolio = store.get('wallet.portfolio') || {};
  const turn = store.get('market.turn') || 0;
  const valueHistory = store.get('wallet.valueHistory') || [];
  const priceHistory = store.get('market.priceHistory') || {};
  const newsText = store.get('market.currentNews') ||
    'El mercado arranca en calma. Analizá las empresas antes de avanzar el tiempo.';

  const portValue = portfolioValue(portfolio, prices);
  const totalRet = totalReturnPct(portfolio, prices);
  const benchRet = benchmarkReturnPct(priceHistory[BENCHMARK] || []);

  container.innerHTML = '';

  // Encabezado: efectivo + valor portafolio
  const header = el('div', { class: 'card', style: 'display:flex;justify-content:space-between;align-items:center;' }, [
    el('div', {}, [
      el('div', { class: 'sub', text: 'Efectivo disponible', style: 'font-size:10px;font-weight:600;' }),
      el('div', { class: 'tnum', text: '$' + cash.toLocaleString('es-AR'), style: 'font-size:18px;font-weight:700;color:var(--green);' }),
    ]),
    el('div', { style: 'text-align:right;' }, [
      el('div', { class: 'sub', text: 'Valor portafolio', style: 'font-size:10px;font-weight:600;' }),
      el('div', { class: 'tnum', text: '$' + portValue.toLocaleString('es-AR'), style: 'font-size:18px;font-weight:700;color:var(--gold);' }),
    ]),
  ]);

  // Tarjeta de rendimiento + gráfico del portafolio
  const retColor = totalRet >= 0 ? 'var(--green)' : 'var(--red)';
  const retSign = totalRet >= 0 ? '+' : '';
  const benchSign = benchRet >= 0 ? '+' : '';
  const perfCard = el('div', { class: 'card' }, [
    el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;' }, [
      el('div', {}, [
        el('span', { class: 'sub', text: 'Tu rendimiento', style: 'font-size:11px;font-weight:600;' }),
        el('div', { class: 'tnum', text: retSign + totalRet.toFixed(1) + '%', style: `font-size:22px;font-weight:700;color:${retColor};` }),
      ]),
      el('div', { style: 'text-align:right;' }, [
        el('span', { class: 'sub', text: 'Mercado (SPY)', style: 'font-size:11px;' }),
        el('div', { class: 'tnum sub', text: benchSign + benchRet.toFixed(1) + '%', style: 'font-size:13px;font-weight:600;' }),
      ]),
    ]),
    renderLineChart(valueHistory.map((p) => p.value), { color: retColor }),
  ]);

  // Cable de noticias
  const newsBox = el('div', { class: 'card', style: 'border-style:dashed;font-size:13px;line-height:1.5;' }, [
    el('b', { text: '📰 Cable de Noticias:' }), el('br'),
    el('span', { text: newsText, style: 'color:var(--sub);' }),
  ]);

  const btnAvanzar = el('button', {
    class: 'btn btn-secondary', style: 'margin-bottom:6px;',
    text: '⏳ Avanzar tiempo (nueva noticia y volatilidad)',
    onclick: () => avanzarTiempo(container, store),
  });
  const turnoBadge = el('div', { class: 'sub', text: `Turno ${turn}`, style: 'font-size:11px;text-align:right;margin-bottom:10px;' });

  // Pizarra de activos con sparkline
  const list = el('div', {});
  prices.forEach((asset) => {
    const serie = priceHistory[asset.ticker] || [asset.precio];
    const up = asset.delta >= 0;
    const pillClass = up ? 'pill pill-up' : 'pill pill-down';
    const sign = up ? '+' : '';
    const short = asset.ticker.split(' ')[0];
    const row = el('div', {
      class: 'card', style: 'display:flex;align-items:center;gap:10px;padding:12px;cursor:pointer;margin-bottom:8px;',
      'data-ticker': asset.ticker,
      onclick: () => { selectedTicker = asset.ticker; renderSim(container, { store }); },
    }, [
      el('div', { style: 'flex:1;' }, [
        el('b', { text: short, style: 'font-size:14px;' }),
        el('div', { class: 'sub', text: asset.tipo, style: 'font-size:10px;' }),
      ]),
      renderSparkline(serie, { color: up ? 'var(--green)' : 'var(--red)' }),
      el('div', { style: 'text-align:right;min-width:78px;' }, [
        el('div', { class: 'tnum', text: '$' + asset.precio.toLocaleString('es-AR'), style: 'font-size:13px;font-weight:600;' }),
        el('span', { class: pillClass, text: sign + asset.delta + '%' }),
      ]),
    ]);
    list.appendChild(row);
  });

  // Tenencias con P&L
  const holdings = el('div', {});
  const keys = Object.keys(portfolio).filter((t) => portfolio[t].cantidad > 0);
  if (keys.length === 0) {
    holdings.appendChild(el('div', { class: 'sub center', text: 'No tenés activos comprados todavía.', style: 'padding:12px;font-size:13px;' }));
  } else {
    keys.forEach((ticker) => {
      const h = portfolio[ticker];
      const a = prices.find((p) => p.ticker === ticker);
      if (!a) return;
      const ret = positionReturnPct(h.precioCompra, a.precio);
      const cls = ret >= 0 ? 'pill pill-up' : 'pill pill-down';
      const sign = ret >= 0 ? '+' : '';
      holdings.appendChild(el('div', { style: 'display:flex;justify-content:space-between;padding:9px 4px;border-bottom:1px solid var(--border);' }, [
        el('div', {}, [
          el('b', { text: ticker.split(' ')[0] }),
          el('span', { class: 'sub', text: `  ${h.cantidad} u.`, style: 'font-size:11px;' }),
        ]),
        el('div', { style: 'text-align:right;' }, [
          el('span', { class: 'tnum', text: '$' + (h.cantidad * a.precio).toLocaleString('es-AR'), style: 'font-size:13px;' }),
          el('span', { class: cls, text: '  ' + sign + ret.toFixed(1) + '%', style: 'margin-left:6px;' }),
        ]),
      ]));
    });
  }

  container.append(
    el('h2', { text: 'Simulador', style: 'margin-bottom:14px;' }),
    header, perfCard, newsBox, btnAvanzar, turnoBadge,
    el('h3', { text: 'Pizarra de activos', style: 'font-size:14px;margin:4px 0 8px;color:var(--sub);' }),
    el('p', { class: 'sub', text: 'Tocá un activo para ver su detalle y operar.', style: 'font-size:11px;margin:0 0 10px;' }),
    list,
    el('h3', { text: 'Tus tenencias', style: 'font-size:14px;margin:14px 0 4px;color:var(--sub);' }),
    holdings,
  );
}

// --- Avanzar tiempo: evoluciona precios, persiste historial y valor del portafolio ---
function avanzarTiempo(container, store) {
  const prices = getPrices(store);
  const noticia = NEWS[Math.floor(Math.random() * NEWS.length)];
  const nuevos = applyNewsImpact(prices, noticia);

  store.update((s) => {
    s.market.prices = nuevos;
    s.market.turn = (s.market.turn || 0) + 1;
    s.market.currentNews = noticia.text;
    s.behavior.turnos = (s.behavior.turnos || 0) + 1;
    // Append al historial de precios por activo
    s.market.priceHistory = s.market.priceHistory || {};
    nuevos.forEach((a) => {
      const arr = s.market.priceHistory[a.ticker] || [];
      arr.push(a.precio);
      s.market.priceHistory[a.ticker] = arr.slice(-30); // últimos 30 puntos
    });
    // Append al historial de valor del portafolio
    const val = portfolioValue(s.wallet.portfolio || {}, nuevos);
    s.wallet.valueHistory = (s.wallet.valueHistory || []).concat([{ turn: s.market.turn, value: val }]).slice(-30);
  });

  renderSim(container, { store });
}

function renderDetail(container, store, ticker) {
  const prices = getPrices(store);
  const asset = prices.find((a) => a.ticker === ticker);
  if (!asset) { selectedTicker = null; renderList(container, store); return; }

  const cash = store.get('wallet.cash');
  const portfolio = store.get('wallet.portfolio') || {};
  const priceHistory = store.get('market.priceHistory') || {};
  const holding = portfolio[ticker];
  const serie = priceHistory[ticker] || [asset.precio];
  const up = asset.delta >= 0;
  const sign = up ? '+' : '';

  container.innerHTML = '';

  const back = el('button', {
    class: 'btn btn-ghost', style: 'width:auto;margin-bottom:12px;padding:8px 14px;',
    text: '← Volver a la pizarra',
    onclick: () => { selectedTicker = null; renderSim(container, { store }); },
  });

  const head = el('div', { style: 'margin-bottom:10px;' }, [
    el('h2', { text: ticker.split(' ')[0], style: 'margin:0;' }),
    el('div', { class: 'sub', text: asset.ticker.replace(/^[^(]*/, '').replace(/[()]/g, '') + ' · ' + asset.tipo, style: 'font-size:12px;' }),
  ]);

  const priceRow = el('div', { style: 'display:flex;align-items:baseline;gap:10px;margin:6px 0 12px;' }, [
    el('span', { class: 'tnum', text: '$' + asset.precio.toLocaleString('es-AR'), style: 'font-size:26px;font-weight:700;color:var(--gold);' }),
    el('span', { class: up ? 'pill pill-up' : 'pill pill-down', text: sign + asset.delta + '%' }),
  ]);

  const chartCard = el('div', { class: 'card' }, [renderLineChart(serie, { color: up ? 'var(--green)' : 'var(--red)' })]);
  const descCard = el('div', { class: 'card', style: 'font-size:13px;line-height:1.5;color:var(--sub);' }, [el('span', { text: asset.desc || '' })]);

  // Tu posición
  let posCard;
  if (holding && holding.cantidad > 0) {
    const ret = positionReturnPct(holding.precioCompra, asset.precio);
    const cls = ret >= 0 ? 'pill pill-up' : 'pill pill-down';
    const rs = ret >= 0 ? '+' : '';
    posCard = el('div', { class: 'card' }, [
      el('div', { class: 'sub', text: 'Tu posición', style: 'font-size:11px;font-weight:600;margin-bottom:4px;' }),
      el('div', { style: 'display:flex;justify-content:space-between;' }, [
        el('span', { class: 'tnum', text: `${holding.cantidad} u. · compra $${Math.round(holding.precioCompra).toLocaleString('es-AR')}` }),
        el('span', { class: cls, text: rs + ret.toFixed(1) + '%' }),
      ]),
    ]);
  } else {
    posCard = el('div', { class: 'sub', text: 'Todavía no tenés este activo.', style: 'font-size:12px;margin:4px 0 10px;' });
  }

  // Selector de cantidad + montos rápidos
  const qtyInput = el('input', {
    type: 'number', min: '1', value: '1',
    style: 'width:100%;padding:10px;border-radius:12px;border:1px solid var(--border);background:var(--navy);color:var(--fg);margin-bottom:8px;',
  });
  const quick = el('div', { style: 'display:flex;gap:8px;margin-bottom:10px;' },
    [['25%', 0.25], ['50%', 0.5], ['100%', 1]].map(([label, frac]) =>
      el('button', {
        class: 'btn btn-ghost', style: 'flex:1;justify-content:center;margin:0;padding:8px;font-size:12px;',
        text: label,
        onclick: () => { qtyInput.value = String(Math.max(1, quickAmountQty(cash, asset.precio, frac))); },
      })));

  const buyBtn = el('button', {
    class: 'btn btn-primary', style: 'flex:1;justify-content:center;margin:0;',
    text: 'Comprar', onclick: () => operar(container, store, ticker, 'COMPRA', parseInt(qtyInput.value, 10)),
  });
  const sellBtn = el('button', {
    class: 'btn btn-secondary', style: 'flex:1;justify-content:center;margin:0;',
    text: 'Vender', onclick: () => operar(container, store, ticker, 'VENTA', parseInt(qtyInput.value, 10)),
  });
  const actions = el('div', { style: 'display:flex;gap:10px;' }, [buyBtn, sellBtn]);

  container.append(back, head, priceRow, chartCard, descCard, posCard,
    el('div', { class: 'sub', text: 'Cantidad a operar', style: 'font-size:11px;font-weight:600;margin-bottom:6px;' }),
    qtyInput, quick, actions);
}

// --- Operar por cantidad (preserva cálculos del MVP) ---
function operar(container, store, ticker, accion, qty) {
  const prices = getPrices(store);
  const asset = prices.find((a) => a.ticker === ticker);
  if (!asset) return;
  if (!Number.isFinite(qty) || qty < 1) { toast('Ingresá una cantidad válida.'); return; }

  if (accion === 'COMPRA') {
    const costo = asset.precio * qty;
    if (store.get('wallet.cash') < costo) { toast('Capital insuficiente.'); return; }
    store.update((s) => {
      s.wallet.cash -= costo;
      const pf = s.wallet.portfolio;
      if (!pf[ticker]) pf[ticker] = { cantidad: 0, precioCompra: 0 };
      const h = pf[ticker];
      const costoAnterior = h.cantidad * h.precioCompra;
      h.cantidad += qty;
      h.precioCompra = (costoAnterior + asset.precio * qty) / h.cantidad; // promedio ponderado
      if (asset.delta > 10) s.behavior.comprasEnAlza = (s.behavior.comprasEnAlza || 0) + 1;
      s.behavior.comprasTotales = (s.behavior.comprasTotales || 0) + qty;
      s.behavior.scoreRiesgo = (s.behavior.scoreRiesgo || 0) + asset.pesoRiesgo * qty;
    });
    toast(`Compraste ${qty} u. de ${ticker.split(' ')[0]}.`);
  } else {
    const pf = store.get('wallet.portfolio') || {};
    if (!pf[ticker] || pf[ticker].cantidad < qty) { toast('No tenés suficientes unidades.'); return; }
    store.update((s) => {
      s.wallet.cash += asset.precio * qty;
      s.wallet.portfolio[ticker].cantidad -= qty;
      if (asset.delta < -5) s.behavior.ventasEnBaja = (s.behavior.ventasEnBaja || 0) + 1;
    });
    toast(`Vendiste ${qty} u. de ${ticker.split(' ')[0]}.`);
  }
  renderDetail(container, store, ticker);
}
