import { createStore } from './store.js';
import { createRouter } from './router.js';
import { renderHome } from './views/home.js';
import { renderSim } from './views/sim.js';
import { renderQuiz } from './views/quiz.js';
import { renderLeague } from './views/league.js';
import { renderDashboard } from './views/dashboard.js';
import { mountChat } from './views/chat.js';

const store = createStore();
const container = document.getElementById('app-view');

// Placeholders temporales para las rutas que se completan en tasks siguientes.
const placeholder = (name) => (c) => { c.innerHTML = `<h2>${name}</h2><p class="sub">En construcción</p>`; };

const routes = {
  home: (c) => renderHome(c, { store }),
  sim: (c) => renderSim(c, { store }),
  quiz: (c) => renderQuiz(c, { store }),
  league: (c) => renderLeague(c, { store }),
  dashboard: (c) => renderDashboard(c, { store }),
  profile: placeholder('Perfil de riesgo IA'),
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
