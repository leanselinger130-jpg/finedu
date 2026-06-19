// store.js — estado central con persistencia en localStorage
export const SCHEMA_VERSION = 1;
const KEY = 'finedu-state';

export const DEFAULT_STATE = {
  schemaVersion: SCHEMA_VERSION,
  user: { email: null, createdAt: null },
  wallet: { cash: 100000, portfolio: {}, valueHistory: [] },
  market: { turn: 0, currentNews: null, prices: [], priceHistory: {} },
  progress: { xp: 0, streak: 0, lastActiveDate: null, quizLevelsDone: [], achievements: [] },
  behavior: { comprasEnAlza: 0, ventasEnBaja: 0, turnos: 0, comprasTotales: 0, scoreRiesgo: 0 },
  metrics: { brokerSim: 0, brokerQuiz: 0, mails: 0, shared: 0, ia: 0, hum: 0 },
  settings: { theme: 'dark', brokerSkin: null },
};

function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(override || {})) {
    const bv = base ? base[k] : undefined;
    const ov = override[k];
    out[k] = (ov && typeof ov === 'object' && !Array.isArray(ov) && bv && typeof bv === 'object')
      ? deepMerge(bv, ov) : ov;
  }
  return out;
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setByPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

export function createStore(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  let state;
  const raw = storage ? storage.getItem(KEY) : null;
  if (raw) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
    state = parsed ? deepMerge(structuredClone(DEFAULT_STATE), parsed) : structuredClone(DEFAULT_STATE);
    state.schemaVersion = SCHEMA_VERSION;
  } else {
    state = structuredClone(DEFAULT_STATE);
    if (!state.user.createdAt) state.user.createdAt = new Date().toISOString();
  }
  function persist() { if (storage) storage.setItem(KEY, JSON.stringify(state)); }
  persist();

  return {
    getState: () => structuredClone(state),
    get: (path) => getByPath(state, path),
    set: (path, value) => { setByPath(state, path, value); persist(); },
    update: (fn) => { fn(state); persist(); return structuredClone(state); },
    reset: () => { state = structuredClone(DEFAULT_STATE); persist(); },
  };
}
