import { createStore } from './store.js';
import { createRouter } from './router.js';
import { renderHome } from './views/home.js';
import { renderSim } from './views/sim.js';
import { renderQuiz } from './views/quiz.js';
import { renderLeague } from './views/league.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProfile } from './views/profile.js';
import { renderFraud } from './views/fraud.js';
import { mountChat } from './views/chat.js';
import { applySkin } from './theme.js';
import { computeStreak, todayStr } from './streak.js';

const store = createStore();
applySkin(store.get('settings.brokerSkin'));
store.update((s) => {
  const r = computeStreak(s.progress, todayStr());
  s.progress.streak = r.streak;
  s.progress.lastActiveDate = r.lastActiveDate;
});
const container = document.getElementById('app-view');

const routes = {
  home: (c) => renderHome(c, { store }),
  sim: (c) => renderSim(c, { store }),
  quiz: (c) => renderQuiz(c, { store }),
  league: (c) => renderLeague(c, { store }),
  dashboard: (c) => renderDashboard(c, { store }),
  profile: (c) => renderProfile(c, { store }),
  fraud: (c) => renderFraud(c),
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
