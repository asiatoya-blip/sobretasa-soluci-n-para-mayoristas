/*
 * wizard.js — nxgov-wizard: orquesta nxgov-stepper + paneles + validación por paso.
 * Requiere: stepper.js; opcionales form.js (validación) y emit.js (anuncios).
 *
 * Marcado:
 *   <div class="nxgov-wizard" data-nxgov-component="wizard" data-nxgov-stepper="<id del nav.nxgov-stepper>">
 *     <section class="nxgov-wizard__panel" data-nxgov-wizard-step="1" aria-labelledby="…">
 *       <h2 class="nxgov-section-heading__title" tabindex="-1"> (o .nxgov-wizard__title)
 *       … <button data-nxgov-wizard-prev> … <button data-nxgov-wizard-next>   (en el último paso: data-nxgov-wizard-finish)
 *
 * Comportamiento:
 *  - Continuar valida los campos del panel (nxgov.form.validate). Si hay errores: foco al primero + anuncio; no avanza.
 *  - Al cambiar de paso (botones o clic en un paso completado del stepper): muestra el panel, lleva el wizard al
 *    inicio de la vista y mueve el foco al título del paso (el lector anuncia "Paso N…").
 *  - Finalizar: valida y emite `nxgov:wizard:complete` (cancelable) con detail { id, wizard }.
 *  - Contenido por paso fuera de los paneles (p. ej. nxgov-summary en la columna lateral):
 *      <section data-nxgov-wizard-for="<id del wizard>" data-nxgov-wizard-steps="4"> → visible solo en esos pasos
 *      (lista separada por comas/espacios). Dentro del propio wizard basta data-nxgov-wizard-steps.
 * API: nxgov.wizard.start(rootOrId, { step, max }) · .show(root, n) · .current(root)
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.wizard && nxgov.wizard.__bound) return;

  var CONTROLS = '.nxgov-input__control, .nxgov-select__control';

  function resolve(rootOrId) {
    return typeof rootOrId === 'string' ? document.getElementById(rootOrId) : rootOrId;
  }

  function stepperOf(root) {
    return document.getElementById(root.getAttribute('data-nxgov-stepper')) || root.querySelector('.nxgov-stepper');
  }

  function panels(root) {
    return Array.prototype.slice.call(root.querySelectorAll('.nxgov-wizard__panel'));
  }

  function current(root) {
    var s = stepperOf(root);
    return s && nxgov.stepper ? nxgov.stepper.state(s).current : 1;
  }

  function scrollToTop(root) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function show(rootOrId, n, opts) {
    var root = resolve(rootOrId);
    if (!root) return;
    var target = null;
    panels(root).forEach(function (p) {
      var match = parseInt(p.getAttribute('data-nxgov-wizard-step'), 10) === n;
      p.hidden = !match;
      if (match) target = p;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-nxgov-wizard-steps]'), function (el) {
      var owner = el.getAttribute('data-nxgov-wizard-for');
      if (owner ? owner !== root.id : !root.contains(el)) return;
      el.hidden = el.getAttribute('data-nxgov-wizard-steps').split(/[\s,]+/).indexOf(String(n)) === -1;
    });
    if (!target || (opts && opts.focus === false)) return;
    scrollToTop(root);
    var title = target.querySelector('.nxgov-wizard__title, .nxgov-section-heading__title');
    if (title) title.focus({ preventScroll: true });
  }

  function validatePanel(panel) {
    if (!nxgov.form) return [];
    return Array.prototype.filter.call(panel.querySelectorAll(CONTROLS), function (c) {
      return c.offsetParent !== null && !nxgov.form.validate(c);
    });
  }

  function reportInvalid(invalid) {
    invalid[0].focus();
    if (nxgov.announce) {
      nxgov.announce(
        invalid.length === 1 ? 'Hay 1 campo con error en este paso.' : 'Hay ' + invalid.length + ' campos con errores en este paso.',
        'assertive'
      );
    }
  }

  function start(rootOrId, opts) {
    var root = resolve(rootOrId);
    var stepper = root && stepperOf(root);
    if (!stepper) return;
    var step = (opts && opts.step) || 1;
    var max = Math.max(step, (opts && opts.max) || step);
    stepper.setAttribute('data-nxgov-current', String(step));
    stepper.setAttribute('data-nxgov-max', String(max));
    if (nxgov.stepper) nxgov.stepper.init(stepper);
    show(root, step, opts);
  }

  document.addEventListener('click', function (event) {
    var t = event.target instanceof Element ? event.target : null;
    if (!t) return;
    var btn = t.closest('[data-nxgov-wizard-next], [data-nxgov-wizard-prev], [data-nxgov-wizard-finish]');
    if (!btn) return;
    var root = btn.closest('.nxgov-wizard');
    var stepper = root && stepperOf(root);
    if (!stepper || !nxgov.stepper) return;

    if (btn.hasAttribute('data-nxgov-wizard-prev')) {
      nxgov.stepper.prev(stepper);
      return;
    }

    var panel = btn.closest('.nxgov-wizard__panel');
    var invalid = panel ? validatePanel(panel) : [];
    if (invalid.length) {
      reportInvalid(invalid);
      return;
    }

    if (btn.hasAttribute('data-nxgov-wizard-finish')) {
      root.dispatchEvent(
        new CustomEvent('nxgov:wizard:complete', { bubbles: true, cancelable: true, detail: { id: root.id || null, wizard: root } })
      );
      return;
    }
    nxgov.stepper.next(stepper);
  });

  // Cualquier cambio de paso (botones o clic en el stepper) actualiza el panel visible
  document.addEventListener('nxgov:stepper:step-changed', function (event) {
    var stepper = event.target;
    var root = stepper.closest('.nxgov-wizard') ||
      document.querySelector('.nxgov-wizard[data-nxgov-stepper="' + stepper.id + '"]');
    if (root) show(root, event.detail.to);
  });

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-nxgov-component="wizard"]'), function (root) {
      show(root, current(root), { focus: false });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  nxgov.wizard = { start: start, show: show, current: current, __bound: true };
})(window, document);
