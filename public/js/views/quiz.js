// quiz.js — Vista Aprender / Quiz (Fase 0 port del MVP app-tisi.html ~líneas 640–722)
//
// Diseño de estado interno:
//   El flujo de preguntas vive en variables de módulo para sobrevivir entre
//   re-renders dentro de la misma sesión sin necesidad de serializar al store.
//   El store solo recibe XP (progress.xp += 50 por acierto) y el nivel completado
//   (progress.quizLevelsDone) una vez que el jugador termina sin quedarse sin vidas.
//
// Sustituciones obligatorias vs MVP:
//   - alert("Por favor elegí...") → toast()
//   - alert("Te quedaste sin vidas...") → toast() + regreso a home
//   - alert("¡Completaste este nivel!") → toast() + modal de éxito
//   - confirm("¿Seguro querés salir?") → confirmModal()

import { el, toast, confirmModal } from '../ui.js';
import { QUIZ } from '../data/quizdata.js';

// ─── Estado de módulo ────────────────────────────────────────────────────────
let currentQuestions = [];
let currentLevel = null;
let currentIdx = 0;
let hearts = 3;
let selectedOptionIdx = null;

// ─── Punto de entrada ────────────────────────────────────────────────────────
export function renderQuiz(container, { store }) {
  renderHome(container, store);
}

// ─── Pantalla de selección de nivel ─────────────────────────────────────────
function renderHome(container, store) {
  container.innerHTML = '';

  const xp = store.get('progress.xp') || 0;
  const levelsDone = store.get('progress.quizLevelsDone') || [];

  const levels = [
    {
      key: 'principiante',
      label: 'Nivel 1: Principiante',
      desc: 'Conceptos esenciales, inflación y CEDEARs.',
      color: 'var(--green)',
      icon: '🟢',
    },
    {
      key: 'intermedio',
      label: 'Nivel 2: Intermedio',
      desc: 'Obligaciones Negociables, Tasas y Renta Fija.',
      color: 'var(--gold)',
      icon: '🟡',
    },
    {
      key: 'ia_generado',
      label: 'Nivel Infinito (IA)',
      desc: 'Preguntas aleatorias de alto nivel — desafío abierto.',
      color: '#b39ddb',
      icon: '✨',
    },
  ];

  const levelCards = levels.map((lvl) => {
    const done = levelsDone.includes(lvl.key);
    const badge = done
      ? el('span', { class: 'pill', style: 'background:var(--green);color:#fff;font-size:11px;', text: '✓ Completado' })
      : null;

    return el('div', {
      class: 'card',
      style: 'cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;',
      onclick: () => startQuiz(lvl.key, container, store),
    }, [
      el('div', {}, [
        el('h3', {
          style: `margin:0;color:${lvl.color};font-weight:800;font-size:15px;`,
          text: `${lvl.icon} ${lvl.label}`,
        }),
        el('p', { class: 'sub', style: 'margin:4px 0 0 0;font-size:13px;', text: lvl.desc }),
        badge,
      ]),
      el('span', { style: 'font-size:20px;color:var(--sub);', text: '⚡' }),
    ]);
  });

  const xpBadge = el('div', { class: 'card', style: 'text-align:center;' }, [
    el('div', { class: 'sub', style: 'font-size:11px;font-weight:700;', text: 'TU XP ACUMULADO' }),
    el('div', { class: 'tnum', style: 'font-size:28px;font-weight:800;color:var(--gold);', text: String(xp) }),
  ]);

  container.append(
    el('h2', { text: '🧠 Elegí tu desafío', style: 'margin-bottom:6px;' }),
    el('p', { class: 'sub', style: 'font-size:13px;margin-bottom:18px;', text: 'Completá las lecciones interactivas al estilo trivia.' }),
    xpBadge,
    ...levelCards,
    el('button', {
      class: 'btn btn-ghost',
      style: 'margin-top:8px;',
      text: '← Inicio',
      onclick: () => { location.hash = '#/home'; },
    }),
  );
}

// ─── Iniciar una lección ─────────────────────────────────────────────────────
function startQuiz(level, container, store) {
  currentLevel = level;
  currentQuestions = QUIZ[level];
  currentIdx = 0;
  hearts = 3;
  selectedOptionIdx = null;
  renderQuestion(container, store);
}

// ─── Renderizar la pantalla de pregunta ─────────────────────────────────────
function renderQuestion(container, store) {
  container.innerHTML = '';

  const qData = currentQuestions[currentIdx];
  const total = currentQuestions.length;
  const progressPct = (currentIdx / total) * 100;

  // Encabezado con botón cerrar, barra de progreso y corazones
  const progressBar = el('div', {
    class: 'progress-bar',
    style: `width:${progressPct}%;height:6px;background:var(--green);border-radius:4px;transition:width .3s;`,
  });

  const heartsEl = el('div', {
    style: 'font-size:14px;font-weight:700;white-space:nowrap;',
    text: '❤️ ' + hearts,
  });

  const header = el('div', {
    style: 'display:flex;align-items:center;gap:10px;margin-bottom:18px;',
  }, [
    el('button', {
      class: 'btn btn-ghost',
      style: 'width:auto;padding:4px 10px;font-size:13px;margin-bottom:0;',
      text: '✕',
      onclick: () => handleClose(container, store),
    }),
    el('div', {
      style: 'flex:1;background:var(--border);border-radius:4px;height:6px;overflow:hidden;',
    }, [progressBar]),
    heartsEl,
  ]);

  // Indicador de pregunta
  const qLabel = el('p', {
    class: 'sub',
    style: 'font-size:12px;margin-bottom:6px;',
    text: `Pregunta ${currentIdx + 1} de ${total}`,
  });

  // Texto de la pregunta
  const qText = el('h3', {
    style: 'font-size:16px;line-height:1.4;margin-bottom:18px;',
    text: qData.q,
  });

  // Opciones seleccionables
  const optionBtns = qData.options.map((opt, idx) =>
    el('button', {
      class: 'btn btn-secondary',
      style: 'text-align:left;font-size:14px;line-height:1.4;padding:12px 14px;',
      text: opt,
      onclick: (e) => {
        selectedOptionIdx = idx;
        // Limpiar selección previa
        optionBtns.forEach((b) => b.style.removeProperty('border-color'));
        optionBtns.forEach((b) => b.style.removeProperty('color'));
        // Marcar la opción elegida
        e.currentTarget.style.borderColor = 'var(--gold)';
        e.currentTarget.style.color = 'var(--gold)';
      },
    })
  );

  const optionsWrap = el('div', { style: 'display:flex;flex-direction:column;gap:10px;margin-bottom:18px;' }, optionBtns);

  // Caja de feedback (oculta inicialmente)
  const feedbackBox = el('div', {
    style: 'display:none;padding:14px;border-radius:12px;font-size:14px;line-height:1.5;margin-bottom:14px;',
  });

  // Botón comprobar
  const btnCheck = el('button', {
    class: 'btn btn-primary',
    text: 'Comprobar',
    onclick: () => checkAnswer(qData, optionBtns, feedbackBox, btnCheck, btnNext, store, container),
  });

  // Botón siguiente (oculto hasta comprobar)
  const btnNext = el('button', {
    class: 'btn btn-secondary',
    style: 'display:none;',
    text: currentIdx + 1 < total ? 'Siguiente →' : '🎉 Finalizar',
    onclick: () => advance(container, store),
  });

  container.append(header, qLabel, qText, optionsWrap, feedbackBox, btnCheck, btnNext);
}

// ─── Comprobar respuesta ─────────────────────────────────────────────────────
function checkAnswer(qData, optionBtns, feedbackBox, btnCheck, btnNext, store, container) {
  if (selectedOptionIdx === null) {
    toast('Por favor elegí una opción.');
    return;
  }

  const isCorrect = selectedOptionIdx === qData.correct;

  // Colorear opciones con el resultado
  optionBtns.forEach((b, i) => {
    b.disabled = true;
    b.style.removeProperty('border-color');
    b.style.removeProperty('color');
    if (i === qData.correct) {
      b.style.borderColor = 'var(--green)';
      b.style.color = 'var(--green)';
    }
    if (!isCorrect && i === selectedOptionIdx) {
      b.style.borderColor = 'var(--red)';
      b.style.color = 'var(--red)';
    }
  });

  // Mostrar feedback
  if (isCorrect) {
    feedbackBox.style.display = 'block';
    feedbackBox.style.background = 'color-mix(in srgb, var(--green) 15%, transparent)';
    feedbackBox.style.border = '1px solid var(--green)';
    feedbackBox.style.color = 'var(--green)';
    feedbackBox.textContent = '¡Correcto! ' + qData.explain;

    // Sumar XP al store
    store.update((s) => { s.progress.xp += 50; });
  } else {
    feedbackBox.style.display = 'block';
    feedbackBox.style.background = 'color-mix(in srgb, var(--red) 15%, transparent)';
    feedbackBox.style.border = '1px solid var(--red)';
    feedbackBox.style.color = 'var(--red)';
    feedbackBox.textContent = 'Incorrecto. ' + qData.explain;

    hearts--;

    if (hearts <= 0) {
      toast('Te quedaste sin vidas. ¡A seguir practicando! 💪');
      btnCheck.style.display = 'none';
      setTimeout(() => renderHome(container, store), 1800);
      return;
    }
  }

  btnCheck.style.display = 'none';
  btnNext.style.display = 'block';
}

// ─── Avanzar a la siguiente pregunta ────────────────────────────────────────
function advance(container, store) {
  currentIdx++;
  selectedOptionIdx = null;

  if (currentIdx < currentQuestions.length) {
    renderQuestion(container, store);
  } else {
    // Nivel completado
    store.update((s) => {
      s.progress.quizLevelsDone = s.progress.quizLevelsDone || [];
      if (!s.progress.quizLevelsDone.includes(currentLevel)) {
        s.progress.quizLevelsDone.push(currentLevel);
      }
    });

    const xp = store.get('progress.xp') || 0;

    // Fix 3: fill progress bar to 100% before showing the modal
    const progressBarEl = container.querySelector('.progress-bar');
    if (progressBarEl) progressBarEl.style.width = '100%';

    confirmModal({
      title: '🎉 ¡Nivel completado!',
      body: `Terminaste el nivel con éxito. Ganaste XP por cada respuesta correcta. Tu XP total: ${xp} puntos.`,
      okText: 'Ver mis logros',
      cancelText: 'Seguir practicando',
    }).then((goBack) => {
      if (goBack) {
        location.hash = '#/league';
      } else {
        renderQuiz(container, { store });
      }
    });
  }
}

// ─── Cerrar quiz con confirmación ────────────────────────────────────────────
function handleClose(container, store) {
  confirmModal({
    title: '¿Querés salir?',
    body: 'Si salís ahora perderás el progreso de esta lección (pero el XP ganado se guarda).',
    okText: 'Salir',
    cancelText: 'Continuar',
  }).then((confirmed) => {
    if (confirmed) renderHome(container, store);
  });
}
