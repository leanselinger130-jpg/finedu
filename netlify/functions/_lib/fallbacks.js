// fallbacks.js — cerebro offline / respuestas de respaldo (puro)
export function parsePipe(text) {
  const s = String(text || '');
  const i = s.indexOf('|');
  if (i === -1) return [s.trim(), ''];
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}

export function carteraFor(perfil) {
  const p = String(perfil || '').toLowerCase();
  if (p.includes('conserv')) {
    return [
      { label: 'YMCXO (Obligaciones Negociables)', pct: 55, color: '--green' },
      { label: 'SPY (S&P 500 ETF)', pct: 30, color: '--gold' },
      { label: 'Efectivo líquido', pct: 15, color: '--sub' },
    ];
  }
  if (p.includes('agres')) {
    return [
      { label: 'MELI / VIST (acciones valor)', pct: 50, color: '--red' },
      { label: 'QQQ (Nasdaq ETF)', pct: 35, color: '--gold' },
      { label: 'YMCXO (ON de resguardo)', pct: 15, color: '--green' },
    ];
  }
  return [
    { label: 'SPY / QQQ (índices CEDEAR)', pct: 40, color: '--gold' },
    { label: 'YMCXO (renta fija ON)', pct: 35, color: '--green' },
    { label: 'VIST / MELI (crecimiento)', pct: 25, color: '--red' },
  ];
}

export function localProfile(behavior = {}, portfolio = {}) {
  const ventasEnBaja = behavior.ventasEnBaja || 0;
  const comprasEnAlza = behavior.comprasEnAlza || 0;
  const score = behavior.scoreRiesgo || 0;
  let perfil;
  if (ventasEnBaja >= 2) perfil = 'Conservador';
  else if (comprasEnAlza >= 2) perfil = 'Agresivo';
  else if (score < 6) perfil = 'Conservador';
  else if (score < 14) perfil = 'Moderado';
  else perfil = 'Agresivo';

  const dictamenes = {
    Conservador: 'Tus decisiones muestran aversión a la pérdida: tendés a vender cuando el mercado baja. ' +
      'Priorizá renta fija y diversificación para no operar por miedo. El margen de seguridad de Graham es tu aliado.',
    Moderado: 'Mostrás un equilibrio razonable entre riesgo y prudencia. Sostené la diversificación y evitá ' +
      'dejarte llevar por el ruido del cable de noticias. La paciencia es tu ventaja.',
    Agresivo: 'Tomás riesgo y a veces comprás en euforia (FOMO). Cuidado con el exceso de confianza: ' +
      'contrastá siempre con los fundamentos y mantené un colchón de resguardo.',
  };
  return { perfil, dictamen: dictamenes[perfil], cartera: carteraFor(perfil), source: 'fallback' };
}

export function fraudHeuristic(input) {
  const s = String(input || '').toLowerCase();
  const cnv = ' Verificá siempre si la entidad está registrada en el registro oficial de la CNV (argentina.gob.ar/cnv).';
  if (/(garantiz|sin riesgo|duplic|x2|rendimiento asegurado|urgente|ganancia segura)/.test(s)) {
    return { veredicto: 'SOSPECHOSO', motivo: 'Promete rendimientos garantizados o usa urgencia: señales clásicas de estafa.' + cnv, source: 'fallback' };
  }
  if (/(iol|invertironline|cocos|balanz|bull market|byma|cnv)/.test(s)) {
    return { veredicto: 'PRECAUCIÓN', motivo: 'Parece una entidad del ecosistema local conocido, pero confirmá la dirección exacta.' + cnv, source: 'fallback' };
  }
  return { veredicto: 'PRECAUCIÓN', motivo: 'No reconozco señales claras. No bajes la guardia.' + cnv, source: 'fallback' };
}

export function chatFallback() {
  return 'El Asesor IA está sin conexión por un momento. Mientras tanto, un principio de Graham: invertí con ' +
    '"margen de seguridad" (comprá por debajo del valor que estimás) y no operes por miedo o euforia. Probá de nuevo en un rato.';
}
