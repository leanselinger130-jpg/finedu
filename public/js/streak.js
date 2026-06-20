// streak.js — lógica de racha diaria (pura)
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

export function computeStreak({ streak = 0, lastActiveDate = null }, today) {
  if (lastActiveDate === today) return { streak, lastActiveDate };
  if (lastActiveDate && prevDay(today) === lastActiveDate) {
    return { streak: streak + 1, lastActiveDate: today };
  }
  return { streak: 1, lastActiveDate: today };
}
