// sim-engine.js — lógica pura del simulador (sin DOM, sin store)
export function applyNewsImpact(prices, news, rng = Math.random) {
  const impacto = (news && news.impacto) || {};
  return prices.map((a) => {
    const base = impacto[a.ticker] !== undefined
      ? impacto[a.ticker]
      : Math.floor(rng() * 9) - 4;
    return { ...a, delta: base, precio: Math.max(1000, Math.round(a.precio * (1 + base / 100))) };
  });
}

export function portfolioValue(portfolio, prices) {
  let total = 0;
  for (const ticker of Object.keys(portfolio || {})) {
    const h = portfolio[ticker];
    if (h && h.cantidad > 0) {
      const a = prices.find((p) => p.ticker === ticker);
      if (a) total += h.cantidad * a.precio;
    }
  }
  return total;
}

export function positionReturnPct(precioCompra, precioActual) {
  return ((precioActual - precioCompra) / precioCompra) * 100;
}

export function totalInvestedCost(portfolio) {
  let total = 0;
  for (const ticker of Object.keys(portfolio || {})) {
    const h = portfolio[ticker];
    if (h && h.cantidad > 0) total += h.cantidad * h.precioCompra;
  }
  return total;
}

export function totalReturnPct(portfolio, prices) {
  const cost = totalInvestedCost(portfolio);
  if (cost === 0) return 0;
  return ((portfolioValue(portfolio, prices) - cost) / cost) * 100;
}

export function quickAmountQty(cash, precio, fraction) {
  if (!precio || precio <= 0) return 0;
  return Math.max(0, Math.floor((cash * fraction) / precio));
}

export function benchmarkReturnPct(history) {
  if (!Array.isArray(history) || history.length < 2) return 0;
  const first = history[0];
  const last = history[history.length - 1];
  if (!first) return 0;
  return ((last - first) / first) * 100;
}
