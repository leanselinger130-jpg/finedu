// ai.js — handler serverless de FINEDU (formato Web estándar de Netlify Functions)
import { handleAi } from './_lib/ai-core.js';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const result = await handleAi({ body, apiKey: process.env.GEMINI_API_KEY, fetchFn: fetch });
  return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
