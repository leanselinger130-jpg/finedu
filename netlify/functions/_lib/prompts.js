// prompts.js — system-prompts y armado del cuerpo de la request a Gemini (puro)
export const MODEL = 'gemini-2.5-flash';

export const SYSTEM_PROMPTS = {
  chat:
    'Sos el "Asesor IA" de FINEDU, una app argentina de educación financiera. Actuás como un tutor cercano ' +
    '(maestro y garante) para un inversor minorista principiante. Hablás en español rioplatense, claro y sin jerga. ' +
    'Te basás en el criterio de inversión en valor de Benjamin Graham (margen de seguridad, Mr. Market, largo plazo, ' +
    'diversificación). Conocés instrumentos argentinos: CEDEARs, ETFs CEDEAR (SPY, QQQ), acciones (MELI, VIST) y ' +
    'Obligaciones Negociables. IMPORTANTE: educás, NO das consejos de inversión reales ni recomendaciones de compra/venta; ' +
    'si te piden "qué comprar", explicás cómo razonarlo. Podés comentar la conducta del usuario en el simulador con tacto. ' +
    'Respuestas breves (máx 5 líneas), concretas y amables.',
  profile:
    'Sos un analista de finanzas conductuales. A partir de las decisiones de un usuario en un simulador de inversión bajo ' +
    'estrés y volatilidad, perfilás su riesgo psicológico real. Usás terminología de sesgos (aversión a la pérdida, FOMO, ' +
    'exceso de confianza, diversificación). DEVOLVÉ EXACTAMENTE este formato: primero una sola palabra CONSERVADOR, MODERADO ' +
    'o AGRESIVO; luego un caracter pipe "|"; luego un párrafo de máximo 4 líneas justificando, en español rioplatense.',
  fraud:
    'Sos un escudo anti-fraude financiero para usuarios argentinos. Te pasan una URL, nombre de plataforma o propuesta de ' +
    'inversión y evaluás señales de riesgo (promesas de rendimiento garantizado, urgencia, dominios raros, falta de registro). ' +
    'NO tenés acceso en vivo a bases de datos. DEVOLVÉ EXACTAMENTE este formato: primero una sola etiqueta SOSPECHOSO, ' +
    'PRECAUCIÓN o PROBABLEMENTE_LEGÍTIMO; luego un caracter pipe "|"; luego 2-3 líneas en español rioplatense explicando por ' +
    'qué, y SIEMPRE recordá verificar si la entidad está registrada en el registro oficial de la CNV (argentina.gob.ar/cnv).',
};

function userTurn(text) { return { role: 'user', parts: [{ text }] }; }

export function buildRequestBody(intent, payload = {}) {
  const system = SYSTEM_PROMPTS[intent] || SYSTEM_PROMPTS.chat;
  let contents;
  if (intent === 'chat') {
    const ctx = payload.context || {};
    const ctxText =
      'Contexto del usuario (no lo repitas literal): ' +
      `pantalla=${ctx.pantalla || 'desconocida'}; ` +
      `cartera=${JSON.stringify(ctx.cartera || {})}; ` +
      `últimas operaciones=${JSON.stringify(ctx.ultimasOps || [])}.`;
    const convo = (payload.messages || []).map((m) =>
      ({ role: m.role === 'bot' ? 'model' : 'user', parts: [{ text: m.text }] }));
    contents = [userTurn(ctxText), ...convo];
  } else if (intent === 'profile') {
    const b = payload.behavior || {};
    const text =
      'Datos de comportamiento del usuario en el simulador:\n' +
      `- Compras en escenarios de alza (FOMO): ${b.comprasEnAlza || 0}\n` +
      `- Ventas en escenarios de baja (pánico / aversión a la pérdida): ${b.ventasEnBaja || 0}\n` +
      `- Turnos operando: ${b.turnos || 0}\n` +
      `- Score de riesgo acumulado: ${b.scoreRiesgo || 0}\n` +
      `- Cartera actual: ${JSON.stringify(payload.portfolio || {})}\n` +
      'Clasificá su perfil con el formato pedido.';
    contents = [userTurn(text)];
  } else {
    // fraud
    contents = [userTurn(`Evaluá esta inversión/URL/plataforma: "${payload.input || ''}". Respondé con el formato pedido.`)];
  }
  return { systemInstruction: { parts: [{ text: system }] }, contents };
}
