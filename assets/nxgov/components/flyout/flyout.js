/*
 * flyout.js — Comportamiento de nxgov-flyout (requiere utils/js/emit.js antes; usa <dialog> nativo).
 *
 * Marcado:
 *   <button data-nxgov-flyout-open="id-del-dialog" aria-haspopup="dialog" aria-controls="id" aria-expanded="false">
 *   <dialog class="nxgov-flyout" id="id" aria-labelledby="…">  …  <button data-nxgov-flyout-close>
 *
 * Garantías de accesibilidad:
 *  - showModal(): fondo inerte + aria-modal (también se fija explícitamente) + capa superior.
 *  - Focus-trap: Tab / Shift+Tab ciclan dentro del panel (no escapan a la barra del navegador).
 *  - Esc (evento `cancel`), clic en el fondo y [data-nxgov-flyout-close] cierran con animación.
 *  - Al cerrar, el foco vuelve al disparador; aria-expanded se sincroniza.
 *  - Bloqueo de scroll del documento con compensación del ancho de la barra (sin salto de layout).
 *
 * API: nxgov.flyout.open(idOrEl, trigger?) · nxgov.flyout.close(idOrEl) · nxgov.flyout.toggle(idOrEl, trigger?)
 * Eventos: nxgov:action:open / nxgov:action:close (detail.component = 'flyout'); `open` es cancelable.
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.flyout && nxgov.flyout.__bound) return;

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var triggers = new WeakMap(); // dialog → botón que lo abrió

  function resolve(idOrEl) {
    return typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  }

  function emit(dialog, action) {
    return nxgov.emit ? nxgov.emit(dialog, action, { component: 'flyout', id: dialog.id }) : true;
  }

  function afterTransition(el, done) {
    var ms = parseFloat(window.getComputedStyle(el).transitionDuration) * 1000 || 0;
    if (!ms) return done();
    var finished = false;
    function finish(event) {
      if (finished || (event && (event.target !== el || event.propertyName !== 'transform'))) return;
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
    } else if (!document.querySelector('.nxgov-flyout[open], .nxgov-modal[open]')) {
      root.classList.remove('nxgov-scroll-locked');
      root.style.removeProperty('--nxgov-scrollbar-width');
    }
  }

  function setExpanded(dialog, expanded) {
    var selector = '[data-nxgov-flyout-open="' + dialog.id + '"]';
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (btn) {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  function open(idOrEl, trigger) {
    var dialog = resolve(idOrEl);
    if (!dialog || dialog.open) return;
    if (!emit(dialog, 'open')) return;

    triggers.set(dialog, trigger || document.activeElement);
    dialog.setAttribute('aria-modal', 'true');
    lockScroll(true);
    dialog.showModal();
    setExpanded(dialog, true);

    // Foco inicial: [autofocus] o el primer control del panel (normalmente "Cerrar").
    var first = dialog.querySelector('[autofocus]') || dialog.querySelector(FOCUSABLE);
    if (first) first.focus();

    // Doble rAF: garantiza que el estado inicial (translateX(100%)) se pinte antes de animar.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        dialog.classList.add('nxgov-is-open');
      });
    });
  }

  function close(idOrEl) {
    var dialog = resolve(idOrEl);
    if (!dialog || !dialog.open || dialog.classList.contains('nxgov-is-closing')) return;

    dialog.classList.add('nxgov-is-closing');
    dialog.classList.remove('nxgov-is-open');
    afterTransition(dialog, function () {
      dialog.classList.remove('nxgov-is-closing');
      dialog.close();
      lockScroll(false);
      setExpanded(dialog, false);
      var trigger = triggers.get(dialog);
      if (trigger && document.contains(trigger)) trigger.focus();
      emit(dialog, 'close');
    });
  }

  function toggle(idOrEl, trigger) {
    var dialog = resolve(idOrEl);
    if (dialog && dialog.open) close(dialog);
    else open(dialog, trigger);
  }

  // Focus-trap explícito (showModal ya hace inerte el fondo; esto evita salir a la UI del navegador).
  function trapFocus(dialog, event) {
    var items = Array.prototype.filter.call(dialog.querySelectorAll(FOCUSABLE), function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    var opener = target.closest('[data-nxgov-flyout-open]');
    if (opener) {
      toggle(opener.getAttribute('data-nxgov-flyout-open'), opener);
      return;
    }

    var closer = target.closest('[data-nxgov-flyout-close]');
    if (closer) {
      close(closer.closest('.nxgov-flyout'));
      return;
    }

    // Clic en el ::backdrop: el evento llega al <dialog> con coordenadas fuera del panel.
    if (target.classList.contains('nxgov-flyout') && target.open) {
      var r = target.getBoundingClientRect();
      var inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      if (!inside) close(target);
    }
  });

  // Esc nativo → animar en lugar de cerrar de golpe.
  document.addEventListener(
    'cancel',
    function (event) {
      if (event.target instanceof Element && event.target.classList.contains('nxgov-flyout')) {
        event.preventDefault();
        close(event.target);
      }
    },
    true
  );

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    var dialog = document.querySelector('.nxgov-flyout[open]');
    if (dialog) trapFocus(dialog, event);
  });

  nxgov.flyout = { open: open, close: close, toggle: toggle, __bound: true };
})(window, document);
