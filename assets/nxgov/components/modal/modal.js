/*
 * modal.js — Comportamiento de nxgov-modal (usa <dialog> nativo; emit.js opcional).
 *
 * Marcado:
 *   <button data-nxgov-modal-open="id-del-dialog" aria-haspopup="dialog">            (opcional: abrir por atributo)
 *   <dialog class="nxgov-modal" id="id" aria-labelledby="…" aria-describedby="…">
 *     … <button data-nxgov-modal-close="cancel"> … <button data-nxgov-modal-close="confirm">
 *
 * Garantías de accesibilidad:
 *  - showModal(): fondo inerte + capa superior; aria-modal explícito.
 *  - Foco inicial: [autofocus] (en confirmaciones, la opción NO destructiva) o el título (tabindex="-1").
 *  - Focus-trap Tab/Shift+Tab; Esc cierra con valor "cancel"; al cerrar, el foco vuelve al disparador
 *    (si ya no existe o está oculto, a opts.returnFocus o al <h1> visible).
 *  - Sin cierre por clic en el fondo (los modales de resultado/confirmación requieren una decisión explícita).
 *
 * API:
 *   nxgov.modal.open(idOrEl, { trigger, returnFocus })  → Promise<string> con el valor de cierre
 *   nxgov.modal.close(idOrEl, valor)
 * Eventos: nxgov:action:open (cancelable) · nxgov:modal:closed (detail.value) — detail.component = 'modal'.
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.modal && nxgov.modal.__bound) return;

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var state = new WeakMap(); // dialog → { trigger, returnFocus, resolve }

  function resolveEl(idOrEl) {
    return typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  }

  function afterTransition(el, done) {
    var ms = parseFloat(window.getComputedStyle(el).transitionDuration) * 1000 || 0;
    if (!ms) return done();
    var finished = false;
    function finish(event) {
      if (finished || (event && event.target !== el)) return;
      finished = true;
      el.removeEventListener('transitionend', finish);
      done();
    }
    el.addEventListener('transitionend', finish);
    window.setTimeout(finish, ms + 80);
  }

  function lockScroll(lock) {
    var root = document.documentElement;
    if (lock) {
      root.style.setProperty('--nxgov-scrollbar-width', window.innerWidth - root.clientWidth + 'px');
      root.classList.add('nxgov-scroll-locked');
    } else if (!document.querySelector('.nxgov-modal[open], .nxgov-flyout[open]')) {
      root.classList.remove('nxgov-scroll-locked');
      root.style.removeProperty('--nxgov-scrollbar-width');
    }
  }

  function visible(el) {
    return el && document.contains(el) && el.getClientRects().length > 0;
  }

  function open(idOrEl, opts) {
    var dialog = resolveEl(idOrEl);
    opts = opts || {};
    if (!dialog) return Promise.resolve(null);
    if (dialog.open) return Promise.resolve(null);
    if (nxgov.emit && !nxgov.emit(dialog, 'open', { component: 'modal', id: dialog.id })) return Promise.resolve(null);

    return new Promise(function (resolve) {
      state.set(dialog, { trigger: opts.trigger || document.activeElement, returnFocus: opts.returnFocus, resolve: resolve });
      dialog.setAttribute('aria-modal', 'true');
      lockScroll(true);
      dialog.showModal();

      var first = dialog.querySelector('[autofocus]') || dialog.querySelector('.nxgov-modal__title');
      if (first) first.focus();

      // Doble rAF: pinta el estado inicial (opacity 0 / scale) antes de animar
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          dialog.classList.add('nxgov-is-open');
        });
      });
    });
  }

  function close(idOrEl, value) {
    var dialog = resolveEl(idOrEl);
    if (!dialog || !dialog.open || dialog.classList.contains('nxgov-is-closing')) return;
    var s = state.get(dialog) || {};
    value = value == null ? 'cancel' : String(value);

    dialog.classList.add('nxgov-is-closing');
    dialog.classList.remove('nxgov-is-open');
    afterTransition(dialog, function () {
      dialog.classList.remove('nxgov-is-closing');
      dialog.close(value);
      var restored = document.activeElement; // foco que restaura el <dialog> nativo (no cuenta como movimiento intencional)
      lockScroll(false);
      if (s.resolve) s.resolve(value);
      // El resolve puede cambiar de vista: se decide el retorno de foco después
      window.setTimeout(function () {
        // Si quien escucha el cierre ya movió el foco a otro control visible (p. ej. la fila siguiente tras eliminar), se respeta
        var current = document.activeElement;
        var moved = current && current !== document.body && current !== restored && current !== s.trigger &&
          !dialog.contains(current) && visible(current);
        var target = moved ? null : [s.returnFocus, s.trigger].filter(visible)[0] ||
          Array.prototype.filter.call(document.querySelectorAll('h1'), visible)[0];
        if (target) {
          if (!target.matches(FOCUSABLE) && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus();
        }
        dialog.dispatchEvent(
          new CustomEvent('nxgov:modal:closed', { bubbles: true, detail: { component: 'modal', id: dialog.id, value: value } })
        );
      }, 0);
      state.delete(dialog);
    });
  }

  function trapFocus(dialog, event) {
    var items = Array.prototype.filter.call(dialog.querySelectorAll(FOCUSABLE), visible);
    if (!items.length) return event.preventDefault();
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    var opener = target.closest('[data-nxgov-modal-open]');
    if (opener) {
      open(opener.getAttribute('data-nxgov-modal-open'), { trigger: opener });
      return;
    }
    var closer = target.closest('[data-nxgov-modal-close]');
    if (closer) close(closer.closest('.nxgov-modal'), closer.getAttribute('data-nxgov-modal-close') || 'cancel');
  });

  // Esc nativo → cierre animado con valor "cancel"
  document.addEventListener(
    'cancel',
    function (event) {
      if (event.target instanceof Element && event.target.classList.contains('nxgov-modal')) {
        event.preventDefault();
        close(event.target, 'cancel');
      }
    },
    true
  );

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    var dialog = document.querySelector('.nxgov-modal[open]');
    if (dialog) trapFocus(dialog, event);
  });

  nxgov.modal = { open: open, close: close, __bound: true };
})(window, document);
