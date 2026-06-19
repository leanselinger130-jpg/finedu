// ai-core.js — orquesta la llamada a Gemini con fallback (fetch inyectable)
import { MODEL, buildRequestBody } from './prompts.js';
import { localProfile, fraudHeuristic, chatFallback, carteraFor, parsePipe } from './fallbacks.js';

const VALID = ['chat', 'profile', 'fraud'];

function fallbackFor(intent, body) {
  if (intent === 'profile') return localProfile(body.behavior, body.portfolio);
  if (intent === 'fraud') return fraudHeuristic(body.input);
  return { reply: chatFallback(), source: 'fallback' };
}

function normalizePerfil(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('conserv')) return 'Conservador';
  if (s.includes('agres')) return 'Agresivo';
  return 'Moderado';
}

export async function handleAi({ body = {}, apiKey, fetchFn = fetch }) {
  const intent = VALID.includes(body.intent) ? body.intent : 'chat';
  if (!apiKey || !VALID.includes(body.intent)) return fallbackFor(intent, body);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const reqBody = buildRequestBody(intent, body);
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    if (!res.ok) return fallbackFor(intent, body);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return fallbackFor(intent, body);

    if (intent === 'chat') return { reply: text.trim(), source: 'ai' };
    if (intent === 'profile') {
      const [rawPerfil, just] = parsePipe(text);
      const perfil = normalizePerfil(rawPerfil);
      return { perfil, dictamen: just || text.trim(), cartera: carteraFor(perfil), source: 'ai' };
    }
    // fraud
    const [veredicto, motivo] = parsePipe(text);
    return { veredicto: veredicto || 'PRECAUCIÓN', motivo: motivo || text.trim(), source: 'ai' };
  } catch (e) {
    console.error('[ai-core] fallback por error:', e?.message);
    return fallbackFor(intent, body);
  }
}
