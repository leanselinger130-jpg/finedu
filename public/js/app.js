import { createStore } from './store.js';
import { createRouter } from './router.js';
import { renderHome } from './views/home.js';
import { renderSim } from './views/sim.js';
import { renderQuiz } from './views/quiz.js';
import { renderLeague } from './views/league.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProfile } from './views/profile.js';
import { renderFraud } from './views/fraud.js';
import { renderChallenge } from './views/challenge.js';
import { mountChat } from './views/chat.js';
import { applySkin } from './theme.js';
import { computeStreak, todayStr } from './streak.js';
import { ACHIEVEMENTS, evaluateAchievements } from './achievements.js';
import { toast } from './ui.js';

const store = createStore();
applySkin(store.get('settings.brokerSkin'));
store.update((s) => {
  const r = computeStreak(s.progress, todayStr());
  s.progress.streak = r.streak;
  s.progress.lastActiveDate = r.lastActiveDate;
});
{
  const st = store.getState();
  const ganados = new Set(st.progress.achievements || []);
  const nuevos = evaluateAchievements(st).filter((id) => !ganados.has(id));
  if (nuevos.length) {
    store.update((s) => { s.progress.achievements = [...(s.progress.achievements || []), ...nuevos]; });
    nuevos.forEach((id) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) toast(`${a.icon} ¡Logro: ${a.label}!`);
    });
  }
}
const container = document.getElementById('app-view');

const routes = {
  home: (c) => renderHome(c, { store }),
  sim: (c) => renderSim(c, { store }),
  quiz: (c) => renderQuiz(c, { store }),
  league: (c) => renderLeague(c, { store }),
  dashboard: (c) => renderDashboard(c, { store }),
  profile: (c) => renderProfile(c, { store }),
  fraud: (c) => renderFraud(c),
  challenge: (c) => renderChallenge(c, { store }),
};

function setActiveNav(name) {
  document.querySelectorAll('.nav-item').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-route') === name);
  });
}

const router = createRouter({ container, routes, onChange: setActiveNav });
router.start();

const chat = mountChat({ store });
document.getElementById('ai-fab').addEventListener('click', () => chat.toggle());
window.addEventListener('finedu:toggle-chat', () => chat.toggle());
