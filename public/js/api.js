// api.js — cliente del backend de IA
export const AI_ENDPOINT = '/.netlify/functions/ai';

export async function callAI(intent, payload = {}) {
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, ...payload }),
    });
    if (!res.ok) return { source: 'error' };
    return await res.json();
  } catch {
    return { source: 'error' };
  }
}
