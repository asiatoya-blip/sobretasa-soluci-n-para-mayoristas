/*
 * emit.js — Bus de acciones nxgov (sin dependencias, script clásico: funciona con file:// y con bundlers).
 *
 * Un único listener delegado en document convierte cada clic sobre [data-nxgov-action] que esté dentro de
 * un [data-nxgov-component] en un CustomEvent `nxgov:action:<acción>` despachado desde el propio botón.
 * El evento burbujea, así que puede escucharse en el componente, en la lista o en document.
 *
 *   document.addEventListener('nxgov:action:sign', function (event) {
 *     var d = event.detail;           // { action, component, id, status, trigger, componentEl }
 *     nxgov.setBusy(d.trigger, true); // indicador de carga accesible mientras se procesa
 *   });
 *
 * - Teclado: los <button> nativos ya traducen Enter/Espacio en click; no se añaden handlers extra.
 * - Ignora disparadores deshabilitados ([disabled], aria-disabled="true") u ocupados (aria-busy="true").
 * - El evento es cancelable: nxgov.emit() devuelve false si algún listener llamó a preventDefault().
 * - API pública: window.nxgov.emit(), .setBusy(el, busy, mensaje?), .announce(mensaje), .ACTION_PREFIX.
 */
(function (window, document) {
  'use strict';

  var ACTION_PREFIX = 'nxgov:action:';
  var ACTION_SELECTOR = '[data-nxgov-action]';
  var COMPONENT_SELECTOR = '[data-nxgov-component]';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.__emitBound) return; // idempotente: evita listeners duplicados si el script se carga dos veces

  /**
   * Despacha `nxgov:action:<action>` desde `target`.
   * @param {Element} target  Elemento emisor (normalmente el botón).
   * @param {string}  action  Nombre de la acción (view, pdf, sign, pay, delete…).
   * @param {Object}  [detail] Datos adicionales que se fusionan en event.detail.
   * @returns {boolean} false si algún listener llamó a preventDefault().
   */
  function emit(target, action, detail) {
    var componentEl = target.closest ? target.closest(COMPONENT_SELECTOR) : null;
    var payload = { action: action, trigger: target };
    if (componentEl) {
      payload.component = componentEl.getAttribute('data-nxgov-component');
      payload.id = componentEl.getAttribute('data-nxgov-id');
      payload.status = componentEl.getAttribute('data-nxgov-status');
      payload.componentEl = componentEl;
    }
    if (detail) {
      for (var key in detail) {
        if (Object.prototype.hasOwnProperty.call(detail, key)) payload[key] = detail[key];
      }
    }
    var event = new CustomEvent(ACTION_PREFIX + action, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: payload,
    });
    return target.dispatchEvent(event);
  }

  var liveRegion = null;

  /**
   * Anuncia un mensaje de estado a lectores de pantalla (WCAG 4.1.3) mediante una única región
   * aria-live compartida y visualmente oculta. Usar para resultados: "Declaración firmada", "Error al pagar".
   * @param {string} message
   * @param {'polite'|'assertive'} [politeness='polite'] assertive solo para errores bloqueantes.
   */
  function announce(message, politeness) {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'nxgov-sr-only';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveRegion);
    }
    liveRegion.setAttribute('aria-live', politeness === 'assertive' ? 'assertive' : 'polite');
    // Vaciar y reescribir en el siguiente frame fuerza el anuncio aunque el texto se repita.
    liveRegion.textContent = '';
    window.requestAnimationFrame(function () {
      liveRegion.textContent = message;
    });
  }

  /**
   * Marca un disparador como "procesando" (o lo libera). Mientras está ocupado se ignoran nuevos clics.
   * aria-busy por sí solo no se anuncia de forma fiable: pasar `message` para anunciarlo.
   * @param {Element} el
   * @param {boolean} busy
   * @param {string} [message] p. ej. "Firmando declaración…" / "Declaración firmada".
   */
  function setBusy(el, busy, message) {
    if (!el) return;
    if (busy) {
      el.setAttribute('aria-busy', 'true');
    } else {
      el.removeAttribute('aria-busy');
    }
    if (message) announce(message);
  }

  function isInactive(el) {
    return (
      el.disabled === true ||
      el.getAttribute('aria-disabled') === 'true' ||
      el.getAttribute('aria-busy') === 'true'
    );
  }

  function onClick(event) {
    var trigger = event.target instanceof Element ? event.target.closest(ACTION_SELECTOR) : null;
    if (!trigger) return;

    var componentEl = trigger.closest(COMPONENT_SELECTOR);
    if (!componentEl) return; // solo acciones dentro de componentes nxgov

    if (isInactive(trigger)) {
      event.preventDefault();
      return;
    }

    emit(trigger, trigger.getAttribute('data-nxgov-action'));
  }

  document.addEventListener('click', onClick);

  nxgov.ACTION_PREFIX = ACTION_PREFIX;
  nxgov.emit = emit;
  nxgov.setBusy = setBusy;
  nxgov.announce = announce;
  nxgov.__emitBound = true;
})(window, document);
