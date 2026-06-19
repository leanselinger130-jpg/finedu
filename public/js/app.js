import { createStore } from './store.js';
import { createRouter } from './router.js';
import { renderHome } from './views/home.js';
import { renderSim } from './views/sim.js';
import { renderQuiz } from './views/quiz.js';

const store = createStore();
const container = document.getElementById('app-view');

// Placeholders temporales para las rutas que se completan en tasks siguientes.
const placeholder = (name) => (c) => { c.innerHTML = `<h2>${name}</h2><p class="sub">En construcción</p>`; };

const routes = {
  home: (c) => renderHome(c, { store }),
  sim: (c) => renderSim(c, { store }),
  quiz: (c) => renderQuiz(c, { store }),
  league: placeholder('Liga'),
  dashboard: placeholder('Dashboard del broker'),
  profile: placeholder('Perfil de riesgo IA'),
};

function setActiveNav(name) {
  document.querySelectorAll('.nav-item').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-route') === name);
  });
}

const router = createRouter({ container, routes, onChange: setActiveNav });
router.start();

document.getElementById('ai-fab').addEventListener('click', () => { location.hash = '#/chat'; });
// El panel de chat se monta en Task 13; por ahora el FAB navega a una ruta inexistente => cae a home.
