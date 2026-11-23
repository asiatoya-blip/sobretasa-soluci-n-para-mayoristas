/*
 * stepper.js — Comportamiento de nxgov-stepper (opcional: emit.js para eventos de acción y anuncios).
 * Migración limpia de GOV.CO v4 linea-avance.js:
 *   v4 checked/active/inactive            → completed / active / upcoming
 *   v4 clic en indicador "checked"         → <button> en pasos completados (teclado nativo)
 *   v4 porcentajes fijos [15,50,80,100]    → progreso calculado para N pasos
 *   v4 ventana móvil de 3 pasos            → resumen "Paso X de N: <nombre>" + barra de fracción
 *   v4 sin límites (falla en el último)    → goTo() acotado a 1..N
 *
 * Marcado (estado inicial renderizado por el servidor; el JS lo normaliza):
 *   <nav class="nxgov-stepper" data-nxgov-component="stepper" data-nxgov-current="2" data-nxgov-max="2"
 *        data-nxgov-navigation="completed|none" aria-label="Progreso del trámite"> … <ol> <li data-nxgov-step> …
 *
 * API:  nxgov.stepper.goTo(rootOrId, n) · .next(root) · .prev(root) · .init(root?) · .state(root)
 * Eventos:
 *   nxgov:action:step            (cancelable) el usuario pulsa un paso completado → detail.to
 *   nxgov:stepper:step-changed   el paso actual cambió → detail { from, to, total, label, id }
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.stepper && nxgov.stepper.__bound) return;

  var STATE_TEXT = { completed: 'completado', upcoming: 'pendiente' };

  function resolve(rootOrId) {
    return typeof rootOrId === 'string' ? document.getElementById(rootOrId) : rootOrId;
  }

  function steps(root) {
    return Array.prototype.slice.call(root.querySelectorAll('.nxgov-stepper__step'));
  }

  function state(root) {
    var total = steps(root).length;
    var current = clamp(parseInt(root.getAttribute('data-nxgov-current'), 10) || 1, 1, total);
    var max = clamp(parseInt(root.getAttribute('data-nxgov-max'), 10) || current, current, total);
    return { current: current, max: max, total: total, navigation: root.getAttribute('data-nxgov-navigation') || 'completed' };
  }

  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  function labelOf(li) {
    var label = li.querySelector('.nxgov-stepper__label');
    return label ? label.textContent.trim() : '';
  }

  /* Cambia el elemento de control (<button> ↔ <span>) conservando hijos y clase. */
  function swapControl(li, interactive, index) {
    var control = li.querySelector('.nxgov-stepper__control');
    if (!control) return;
    var isButton = control.tagName === 'BUTTON';
    if (interactive === isButton) return;
    var next = document.createElement(interactive ? 'button' : 'span');
    next.className = control.className;
    if (interactive) {
      next.type = 'button';
      next.setAttribute('data-nxgov-stepper-go', String(index));
    }
    while (control.firstChild) next.appendChild(control.firstChild);
    var hadFocus = document.activeElement === control;
    control.replaceWith(next);
    if (hadFocus && interactive) next.focus();
  }

  function render(root) {
    var s = state(root);
    var items = steps(root);

    items.forEach(function (li, i) {
      var n = i + 1;
      var st = n === s.current ? 'active' : n <= s.max ? 'completed' : 'upcoming';

      li.classList.remove('nxgov-stepper__step--completed', 'nxgov-stepper__step--active', 'nxgov-stepper__step--upcoming');
      li.classList.add('nxgov-stepper__step--' + st);
      li.setAttribute('data-nxgov-step', String(n));
      if (st === 'active') li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');

      swapControl(li, st === 'completed' && s.navigation !== 'none', n);

      var stateEl = li.querySelector('.nxgov-stepper__state');
      if (stateEl) stateEl.textContent = STATE_TEXT[st] ? ', ' + STATE_TEXT[st] : '';
    });

    root.style.setProperty('--nxgov-stepper-steps', String(s.total));
    root.style.setProperty('--nxgov-stepper-progress', String(s.total > 1 ? (s.current - 1) / (s.total - 1) : 1));
    root.style.setProperty('--nxgov-stepper-fraction', String(s.current / s.total));

    var count = root.querySelector('.nxgov-stepper__summary-count');
    var name = root.querySelector('.nxgov-stepper__summary-label');
    if (count) count.textContent = 'Paso ' + s.current + ' de ' + s.total;
    if (name) name.textContent = labelOf(items[s.current - 1]);
  }

  function goTo(rootOrId, n) {
    var root = resolve(rootOrId);
    if (!root) return false;
    var s = state(root);
    var to = clamp(n, 1, s.total);
    if (to === s.current) return false;

    root.setAttribute('data-nxgov-current', String(to));
    root.setAttribute('data-nxgov-max', String(Math.max(s.max, to)));
    render(root);

    var label = labelOf(steps(root)[to - 1]);
    root.dispatchEvent(
      new CustomEvent('nxgov:stepper:step-changed', {
        bubbles: true,
        detail: { from: s.current, to: to, total: s.total, label: label, id: root.id || null },
      })
    );
    // data-nxgov-announce="false": lo omite (p. ej. nxgov-wizard mueve el foco al título del paso y se leería dos veces)
    if (nxgov.announce && root.getAttribute('data-nxgov-announce') !== 'false') nxgov.announce('Paso ' + to + ' de ' + s.total + ': ' + label);
    return true;
  }

  function next(rootOrId) {
    var root = resolve(rootOrId);
    return root ? goTo(root, state(root).current + 1) : false;
  }

  function prev(rootOrId) {
    var root = resolve(rootOrId);
    return root ? goTo(root, state(root).current - 1) : false;
  }

  function init(scope) {
    var roots = scope && scope.matches && scope.matches('[data-nxgov-component="stepper"]')
      ? [scope]
      : (scope || document).querySelectorAll('[data-nxgov-component="stepper"]');
    Array.prototype.forEach.call(roots, render);
  }

  document.addEventListener('click', function (event) {
    var btn = event.target instanceof Element ? event.target.closest('[data-nxgov-stepper-go]') : null;
    if (!btn) return;
    var root = btn.closest('[data-nxgov-component="stepper"]');
    if (!root) return;
    var to = parseInt(btn.getAttribute('data-nxgov-stepper-go'), 10);
    var proceed = nxgov.emit ? nxgov.emit(btn, 'step', { component: 'stepper', id: root.id || null, to: to }) : true;
    if (proceed) goTo(root, to);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();

  nxgov.stepper = { init: init, goTo: goTo, next: next, prev: prev, state: state, __bound: true };
})(window, document);
