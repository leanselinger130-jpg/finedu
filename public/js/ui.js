// ui.js — helpers de DOM, toast y modal de confirmación (reemplazan alert/confirm)
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style') node.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

export function toast(msg, ms = 2600) {
  const t = el('div', { class: 'toast', role: 'status', text: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export function confirmModal({ title, body, okText = 'Confirmar', cancelText = 'Cancelar' }) {
  return new Promise((resolve) => {
    const close = (val) => { backdrop.remove(); resolve(val); };
    const backdrop = el('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === backdrop) close(false); } }, [
      el('div', { class: 'modal' }, [
        el('h3', { text: title }),
        el('p', { class: 'sub', text: body, style: 'font-size:13px;line-height:1.5;' }),
        el('div', { class: 'modal-actions' }, [
          el('button', { class: 'btn btn-ghost', text: cancelText, onclick: () => close(false) }),
          el('button', { class: 'btn btn-primary', text: okText, onclick: () => close(true) }),
        ]),
      ]),
    ]);
    document.body.append(backdrop);
  });
}
