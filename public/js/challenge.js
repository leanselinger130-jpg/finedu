// challenge.js — desafío por link (puro, sin backend: el puntaje viaja en el querystring)
export function buildChallengeLink(name, xp, origin) {
  return `${origin}/#/challenge?n=${encodeURIComponent(name)}&xp=${xp}`;
}

export function parseChallengeHash(hash) {
  const s = String(hash || '');
  if (!s.startsWith('#/challenge?')) return null;
  const qs = new URLSearchParams(s.slice(s.indexOf('?') + 1));
  const name = qs.get('n');
  const xpRaw = qs.get('xp');
  if (name == null || xpRaw == null) return null;
  const xp = Number.parseInt(xpRaw, 10);
  if (!Number.isFinite(xp) || xp < 0) return null;
  return { name, xp };
}
