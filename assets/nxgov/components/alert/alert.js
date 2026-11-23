/*
 * alert.js — Comportamiento de nxgov-alert (requiere utils/js/emit.js cargado antes).
 *
 * 1) Cierre: clic en [data-nxgov-dismiss] dentro de .nxgov-alert →
 *    emite `nxgov:action:dismiss` (cancelable). Si nadie llama a preventDefault(), la alerta se elimina y el foco
 *    pasa al siguiente elemento enfocable (o al anterior), para que el usuario de teclado no quede "perdido".
 *
 * 2) Mostrar desde JS (forma correcta de que el lector la anuncie: role=alert/status solo se anuncia al INYECTARSE):
 *
 *      nxgov.alert.show(document.getElementById('avisos'), {
 *        variant: 'danger',            // info | success | warning | danger
 *        message: 'No fue posible firmar la declaración.',
 *        title: 'Error',               // opcional
 *        dismissible: true             // opcional (por defecto true)
 *      });
 *
 *    El texto se inserta con textContent (seguro frente a XSS). Devuelve el elemento creado.
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.alert && nxgov.alert.__bound) return;

  var VARIANTS = {
    info: { role: 'status', icon: 'info', label: 'Información: ' },
    success: { role: 'status', icon: 'success', label: 'Éxito: ' },
    warning: { role: 'alert', icon: 'warning', label: 'Advertencia: ' },
    danger: { role: 'alert', icon: 'error', label: 'Error: ' },
  };
  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function icon(className, name) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#nxgov-icon-' + name);
    svg.appendChild(use);
    return svg;
  }

  function nextFocusTarget(alertEl) {
    var all = Array.prototype.filter.call(document.querySelectorAll(FOCUSABLE), function (el) {
      return !alertEl.contains(el) && el.offsetParent !== null;
    });
    var after = all.filter(function (el) {
      return alertEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    return after[0] || all[all.length - 1] || null;
  }

  /* Ejecuta done() al terminar la animación CSS de `el` (o de inmediato si no hay animación / reduced-motion). */
  function afterAnimation(el, done) {
    var ms = parseFloat(window.getComputedStyle(el).animationDuration) * 1000 || 0;
    if (!ms) return done();
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      el.removeEventListener('animationend', finish);
      done();
    }
    el.addEventListener('animationend', finish);
    window.setTimeout(finish, ms + 50); // red de seguridad si animationend no llega
  }

  function dismiss(alertEl, trigger) {
    if (alertEl.classList.contains('nxgov-is-leaving')) return false;
    var proceed = nxgov.emit
      ? nxgov.emit(trigger || alertEl, 'dismiss', { component: 'alert', componentEl: alertEl, id: alertEl.id || null })
      : true;
    if (!proceed) return false;

    // El foco se mueve ANTES de animar: el botón deja de ser operable durante la salida.
    if (alertEl.contains(document.activeElement)) {
      var target = nextFocusTarget(alertEl);
      if (target) target.focus();
    }
    alertEl.style.setProperty('--nxgov-alert-height', alertEl.offsetHeight + 'px');
    alertEl.classList.remove('nxgov-is-entering');
    alertEl.classList.add('nxgov-is-leaving');
    afterAnimation(alertEl, function () {
      alertEl.remove();
    });
    return true;
  }

  function show(container, options) {
    var opts = options || {};
    var v = VARIANTS[opts.variant] || VARIANTS.info;
    var variant = VARIANTS[opts.variant] ? opts.variant : 'info';

    var el = document.createElement('div');
    el.className = 'nxgov-alert nxgov-alert--' + variant;
    el.setAttribute('data-nxgov-component', 'alert');
    el.setAttribute('role', v.role);
    if (opts.id) el.id = opts.id;

    el.appendChild(icon('nxgov-alert__icon', v.icon));

    var content = document.createElement('div');
    content.className = 'nxgov-alert__content';
    if (opts.title) {
      var title = document.createElement('p');
      title.className = 'nxgov-alert__title';
      title.textContent = opts.title;
      content.appendChild(title);
    }
    var msg = document.createElement('p');
    msg.className = 'nxgov-alert__message';
    var prefix = document.createElement('span');
    prefix.className = 'nxgov-sr-only';
    prefix.textContent = v.label;
    msg.appendChild(prefix);
    msg.appendChild(document.createTextNode(opts.message || ''));
    content.appendChild(msg);
    el.appendChild(content);

    if (opts.dismissible !== false) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nxgov-alert__close';
      btn.setAttribute('data-nxgov-dismiss', '');
      btn.setAttribute('aria-label', 'Cerrar notificación');
      btn.appendChild(icon('nxgov-alert__close-icon', 'close'));
      el.appendChild(btn);
    }

    el.classList.add('nxgov-is-entering');
    (container || document.body).appendChild(el);
    // Medir la animación con el elemento ya en el DOM (desconectado no tiene estilos calculados).
    afterAnimation(el, function () {
      el.classList.remove('nxgov-is-entering');
    });
    return el;
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target instanceof Element ? event.target.closest('[data-nxgov-dismiss]') : null;
    if (!trigger) return;
    var alertEl = trigger.closest('.nxgov-alert');
    if (alertEl) dismiss(alertEl, trigger);
  });

  nxgov.alert = { show: show, dismiss: dismiss, __bound: true };
})(window, document);
