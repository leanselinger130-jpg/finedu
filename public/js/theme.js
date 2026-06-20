// theme.js — selección y aplicación de marca blanca
import { BROKERS } from './data/brokers.js';

export function brokerPreset(id) {
  const key = String(id || '').toLowerCase();
  return BROKERS[key] || BROKERS.default;
}

export function applySkin(id, doc = document) {
  const preset = brokerPreset(id);
  doc.documentElement.style.setProperty('--brand', preset.brand);
  return preset;
}
