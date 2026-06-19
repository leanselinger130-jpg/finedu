// router.js — navegación por hash
export function resolveRoute(hash, routeNames, fallback) {
  const clean = String(hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];
  return routeNames.includes(clean) ? clean : fallback;
}

export function createRouter({ container, routes, onChange }) {
  const names = Object.keys(routes);
  const fallback = names[0];
  function renderCurrent() {
    const name = resolveRoute(location.hash, names, fallback);
    container.innerHTML = '';
    routes[name](container, {});
    if (onChange) onChange(name);
  }
  return {
    start() { window.addEventListener('hashchange', renderCurrent); renderCurrent(); },
    navigate(name) { location.hash = `#/${name}`; },
  };
}
