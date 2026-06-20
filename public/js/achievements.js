// achievements.js — definición y evaluación de logros (puro)
export const ACHIEVEMENTS = [
  { id: 'primer_quiz',  label: 'Primera lección', icon: '🎓', check: (s) => (s.progress?.xp || 0) >= 50 },
  { id: 'diversificado', label: 'Cartera diversa', icon: '📊', check: (s) => Object.values(s.wallet?.portfolio || {}).filter((h) => h.cantidad > 0).length >= 3 },
  { id: 'racha3',       label: 'Racha de 3', icon: '🔥', check: (s) => (s.progress?.streak || 0) >= 3 },
  { id: 'operador',     label: 'Primeras operaciones', icon: '📈', check: (s) => (s.behavior?.comprasTotales || 0) >= 3 },
  { id: 'perfilado',    label: 'Perfil analizado', icon: '🧠', check: (s) => (s.behavior?.turnos || 0) >= 3 },
];

export function evaluateAchievements(state) {
  return ACHIEVEMENTS.filter((a) => a.check(state)).map((a) => a.id);
}
