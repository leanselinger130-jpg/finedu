// sim.js — Vista Simulador (Fase 0 port del MVP app-tisi.html líneas 442–545)
//
// Diseño de persistencia de precios:
//   Los precios de mercado viven en `marketPrices` (variable de módulo), inicializado
//   una vez desde ASSETS. Esta copia "en caliente" muta con cada avanzarTiempo().
//   El turno y la noticia actual se persisten en store (market.turn / market.currentNews)
//   para que el badge del turno y el cable de noticias sobrevivan a una recarga.
//   Los precios en sí NO se persisten en Fase 0 (decisión: minimal viable; Fase-1 concern).
//   Justificación: el store es el mínimo de continuidad pedido por el brief —
//   efectivo y portafolio sí se persisten, los precios de mercado se resetean por sesión.

import { el, toast } from '../ui.js';
import { ASSETS, NEWS } from '../data/market.js';

// Copia mutable de precios de mercado: vive a nivel de módulo (una sola instancia
// por carga de página) para sobrevivir entre re-renders dentro de la misma sesión.
let marketPrices = null;

function initMarketPrices() {
  if (!marketPrices) {
    marketPrices = ASSETS.map(a => ({ ...a }));
  }
}

export function renderSim(container, { store }) {
  initMarketPrices();

  // --- Leer estado del store ---
  const cash      = store.get('wallet.cash');
  const portfolio = store.get('wallet.portfolio') || {};
  const turn      = store.get('market.turn') || 0;
  const newsText  = store.get('market.currentNews') ||
    'El mercado arranca en calma. Armá tu posición inicial analizando las empresas antes de avanzar el tiempo.';

  // --- Calcular valor total del portafolio ---
  let totalPortfolioVal = 0;
  Object.keys(portfolio).forEach(ticker => {
    const holding = portfolio[ticker];
    if (holding.cantidad > 0) {
      const asset = marketPrices.find(a => a.ticker === ticker);
      if (asset) totalPortfolioVal += holding.cantidad * asset.precio;
    }
  });

  // --- Construir la vista ---
  container.innerHTML = '';

  // Encabezado con efectivo + portafolio
  const header = el('div', { class: 'card', style: 'display:flex;justify-content:space-between;align-items:center;' }, [
    el('div', {}, [
      el('div', { class: 'sub', text: 'EFECTIVO DISPONIBLE', style: 'font-size:10px;font-weight:700;' }),
      el('div', { class: 'tnum', text: '$' + cash.toLocaleString('es-AR'), style: 'font-size:18px;font-weight:700;color:var(--green);' }),
    ]),
    el('div', { style: 'text-align:right;' }, [
      el('div', { class: 'sub', text: 'VALOR PORTAFOLIO', style: 'font-size:10px;font-weight:700;' }),
      el('div', { class: 'tnum', text: '$' + totalPortfolioVal.toLocaleString('es-AR'), style: 'font-size:18px;font-weight:700;color:var(--gold);' }),
    ]),
  ]);

  // Cable de noticias
  const newsBox = el('div', { class: 'card', style: 'border-style:dashed;font-size:13px;line-height:1.5;' }, [
    el('b', { text: '📰 Cable de Noticias:' }),
    el('br'),
    el('span', { text: newsText, style: 'color:var(--sub);' }),
  ]);

  // Botón avanzar tiempo
  const btnAvanzar = el('button', {
    class: 'btn btn-secondary',
    style: 'margin-bottom:14px;',
    text: '⏳ Avanzar Tiempo (Simular Noticia y Volatilidad)',
    onclick: () => avanzarTiempo(container, store),
  });

  // Título pizarra
  const titleMercado = el('h3', { text: '📊 Pizarra de Activos', style: 'font-size:14px;margin:0 0 8px 0;color:var(--sub);' });

  // Tabla de activos
  const tableBody = document.createElement('tbody');
  marketPrices.forEach(asset => {
    const pillClass = asset.delta >= 0 ? 'pill pill-up' : 'pill pill-down';
    const sign = asset.delta >= 0 ? '+' : '';
    const shortTicker = asset.ticker.split(' ')[0];

    const tr = el('tr', {}, [
      el('td', {}, [
        el('b', { text: shortTicker }),
        el('br'),
        el('span', { text: asset.tipo, style: 'color:var(--sub);font-size:10px;' }),
      ]),
      el('td', { text: '$' + asset.precio.toLocaleString('es-AR') }),
      el('td', {}, [
        el('span', { class: pillClass, text: sign + asset.delta + '%' }),
      ]),
      el('td', { style: 'text-align:right;' }, [
        el('button', {
          class: 'btn btn-secondary',
          style: 'width:auto;padding:4px 10px;font-size:11px;margin-bottom:0;margin-right:4px;color:var(--green);border-color:var(--green);',
          text: 'B',
          onclick: () => ejecutarAccion(asset.ticker, 'COMPRA', container, store),
        }),
        el('button', {
          class: 'btn btn-secondary',
          style: 'width:auto;padding:4px 10px;font-size:11px;margin-bottom:0;color:var(--red);border-color:var(--red);',
          text: 'S',
          onclick: () => ejecutarAccion(asset.ticker, 'VENTA', container, store),
        }),
      ]),
    ]);
    tableBody.appendChild(tr);
  });

  const tableMarket = el('table', { style: 'width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: 'Activo', style: 'padding:8px;color:var(--sub);font-weight:700;border-bottom:1px solid var(--border);text-align:left;' }),
        el('th', { text: 'Precio', style: 'padding:8px;color:var(--sub);font-weight:700;border-bottom:1px solid var(--border);text-align:left;' }),
        el('th', { text: 'Var.', style: 'padding:8px;color:var(--sub);font-weight:700;border-bottom:1px solid var(--border);text-align:left;' }),
        el('th', { text: 'Acciones', style: 'padding:8px;color:var(--sub);font-weight:700;border-bottom:1px solid var(--border);text-align:right;' }),
      ]),
    ]),
    tableBody,
  ]);

  // Separador + tenencias
  const hr = el('hr', { style: 'border:0;border-top:1px solid var(--border);margin:14px 0;' });
  const titleTenencias = el('h3', { text: '💼 Tus Tenencias actuales', style: 'font-size:14px;margin:0 0 8px 0;color:var(--sub);' });

  const holdingsBody = document.createElement('tbody');
  const portfolioKeys = Object.keys(portfolio).filter(t => portfolio[t].cantidad > 0);

  if (portfolioKeys.length === 0) {
    holdingsBody.appendChild(
      el('tr', {}, [
        el('td', { colspan: '4', text: 'No tenés activos comprados todavía.', style: 'text-align:center;color:var(--sub);font-weight:500;padding:12px;' }),
      ])
    );
  } else {
    portfolioKeys.forEach(ticker => {
      const holding = portfolio[ticker];
      const asset = marketPrices.find(a => a.ticker === ticker);
      if (!asset) return;

      // Cálculo de rendimiento: idéntico al MVP
      const rendPct = ((asset.precio - holding.precioCompra) / holding.precioCompra) * 100;
      const rendClass = rendPct >= 0 ? 'pill pill-up' : 'pill pill-down';
      const rendSign = rendPct >= 0 ? '+' : '';
      const shortTicker = ticker.split(' ')[0];

      holdingsBody.appendChild(
        el('tr', {}, [
          el('td', { style: 'padding:6px 8px;border-bottom:1px solid var(--border);' }, [
            el('b', { text: shortTicker }),
          ]),
          el('td', { text: holding.cantidad + ' u.', style: 'padding:6px 8px;border-bottom:1px solid var(--border);' }),
          el('td', { text: '$' + Math.round(holding.precioCompra).toLocaleString('es-AR'), style: 'padding:6px 8px;border-bottom:1px solid var(--border);' }),
          el('td', { style: 'text-align:right;padding:6px 8px;border-bottom:1px solid var(--border);' }, [
            el('span', { class: rendClass, text: rendSign + rendPct.toFixed(1) + '%' }),
          ]),
        ])
      );
    });
  }

  const tableHoldings = el('table', { style: 'width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: 'Activo', style: 'padding:8px;color:var(--sub);font-weight:700;border-bottom:1px solid var(--border);text-align:left;' }),
        el('th', { text: 'Cant.', style: 'padding:8px;color:var(--sub);font-weight:700;border-bottom:1px solid var(--border);text-align:left;' }),
        el('th', { text: 'Compra', style: 'padding:8px;color:var(--sub);font-weight:700;border-bottom:1px solid var(--border);text-align:left;' }),
        el('th', { text: 'Rend.', style: 'padding:8px;color:var(--sub);font-weight:700;border-bottom:1px solid var(--border);text-align:right;' }),
      ]),
    ]),
    holdingsBody,
  ]);

  // Indicador de turnos
  const turnoBadge = el('div', { class: 'sub', text: `Turno ${turn}`, style: 'font-size:11px;text-align:right;margin-bottom:8px;' });

  container.append(
    el('h2', { text: 'Simulador de Estrategia', style: 'margin-bottom:14px;' }),
    header,
    newsBox,
    btnAvanzar,
    turnoBadge,
    titleMercado,
    tableMarket,
    hr,
    titleTenencias,
    tableHoldings,
  );
}

// --- Lógica de acciones (port directo de ejecutarAccionSim) ---
function ejecutarAccion(ticker, accion, container, store) {
  const asset = marketPrices.find(a => a.ticker === ticker);

  if (accion === 'COMPRA') {
    const cash = store.get('wallet.cash');
    if (cash >= asset.precio) {
      store.update(s => {
        s.wallet.cash -= asset.precio;
        s.behavior.comprasEnAlza = s.behavior.comprasEnAlza || 0;
        if (asset.delta > 10) s.behavior.comprasEnAlza += 1;
        s.behavior.comprasTotales = (s.behavior.comprasTotales || 0) + 1;
        s.behavior.scoreRiesgo = (s.behavior.scoreRiesgo || 0) + asset.pesoRiesgo;

        const portfolio = s.wallet.portfolio;
        if (!portfolio[ticker]) {
          portfolio[ticker] = { cantidad: 1, precioCompra: asset.precio };
        } else {
          // Precio promedio ponderado — cálculo idéntico al MVP
          const holding = portfolio[ticker];
          const costoTotalAnterior = holding.cantidad * holding.precioCompra;
          holding.cantidad += 1;
          holding.precioCompra = (costoTotalAnterior + asset.precio) / holding.cantidad;
        }
      });
    } else {
      toast('Capital insuficiente.');
      return;
    }
  } else if (accion === 'VENTA') {
    const portfolio = store.get('wallet.portfolio') || {};
    if (portfolio[ticker] && portfolio[ticker].cantidad > 0) {
      store.update(s => {
        s.wallet.cash += asset.precio;
        s.behavior.ventasEnBaja = s.behavior.ventasEnBaja || 0;
        if (asset.delta < -5) s.behavior.ventasEnBaja += 1;
        s.wallet.portfolio[ticker].cantidad -= 1;
      });
    } else {
      toast('No tenés unidades de este activo.');
      return;
    }
  }

  renderSim(container, { store });
}

// --- Avanzar tiempo (port directo de avanzarEscenarioMacro) ---
function avanzarTiempo(container, store) {
  const noticia = NEWS[Math.floor(Math.random() * NEWS.length)];

  // Aplicar impacto de la noticia a los precios en memoria
  marketPrices.forEach(asset => {
    const impactoBase = noticia.impacto[asset.ticker] !== undefined
      ? noticia.impacto[asset.ticker]
      : (Math.floor(Math.random() * 9) - 4); // impacto aleatorio si no está en la noticia
    asset.delta = impactoBase;
    asset.precio = Math.max(1000, Math.round(asset.precio * (1 + impactoBase / 100)));
  });

  // Persistir turno y noticia actual en store
  store.update(s => {
    s.market.turn = (s.market.turn || 0) + 1;
    s.market.currentNews = noticia.text;
    s.behavior.turnos = (s.behavior.turnos || 0) + 1;
  });

  renderSim(container, { store });
}
