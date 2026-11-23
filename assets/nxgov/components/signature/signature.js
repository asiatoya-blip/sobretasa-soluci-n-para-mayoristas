/*
 * signature.js — nxgov-signature: pantalla de firmas (Figma 46:2628 → 271:1531). La firma la realiza un SERVICIO
 * EXTERNO: este componente solo recoge los datos, emite la intención y CONSUME LA RESPUESTA.
 * Requiere emit.js y alert.js; opcional form.js (validación).
 *
 * Marcado (resumen; ver signature.html):
 *   <section class="nxgov-signature" data-nxgov-component="signature" data-nxgov-id="2026-09">
 *     <div class="nxgov-signature__alerts" data-nxgov-signature-alerts></div>      (opcional; si no, junto al verificador)
 *     <fieldset data-nxgov-signature-verifier> … campos del contador/revisor …
 *       <div class="nxgov-signature__alerts" data-nxgov-signature-alerts></div>
 *       <button data-nxgov-signature-verify>Verificar</button>
 *     <button data-nxgov-signature-back>Atrás</button>
 *     <button data-nxgov-signature-submit aria-disabled="true" aria-describedby="…hint">Firmar</button>
 *
 * Flujo:
 *  1. Verificar → valida los campos del verificador → emite `nxgov:action:verify` (cancelable)
 *     detail: { component: 'signature', id, data: { campo: valor }, trigger }
 *  2. El CMS llama al servicio de identidad y entrega la respuesta: nxgov.signature.applyResponse(root, respuesta)
 *  3. Firmar (habilitado solo tras 'verified') → valida todo → emite `nxgov:action:sign` (component 'signature')
 *  4. El CMS llama al servicio de firma y entrega la respuesta con applyResponse.
 *
 * Contrato de respuesta:  { status: 'verified' | 'signed' | 'error', message?: string }
 *   verified → bloquea los datos verificados, oculta Verificar, aviso de éxito, habilita Firmar (foco en Firmar)
 *   signed   → emite `nxgov:signature:signed` (la página decide a dónde ir)
 *   error    → aviso de error (role=alert) con message; el usuario puede reintentar
 * Eventos de estado: nxgov:signature:verified · nxgov:signature:signed · nxgov:signature:failed (detail.stage)
 * API: nxgov.signature.applyResponse(rootOrId, respuesta) · .reset(rootOrId) · .state(rootOrId)
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.signature && nxgov.signature.__bound) return;

  var CONTROLS = '.nxgov-input__control, .nxgov-select__control';
  var MESSAGES = {
    verified: 'Su identidad ha sido verificada, por favor proceda con la firma del documento con el paso a paso enviado a su correo electrónico.',
    verifyError: 'No fue posible verificar la identidad. Revisa los datos e inténtalo de nuevo.',
    signError: 'No fue posible firmar la declaración. Inténtalo de nuevo más tarde.',
    pending: 'Verificando la identidad…',
    signing: 'Enviando la declaración al servicio de firma…',
  };

  function resolve(rootOrId) {
    return typeof rootOrId === 'string' ? document.getElementById(rootOrId) : rootOrId;
  }

  function $(sel, scope) {
    return scope.querySelector(sel);
  }

  function state(rootOrId) {
    var root = resolve(rootOrId);
    return (root && root.getAttribute('data-nxgov-signature-state')) || 'idle';
  }

  function setState(root, value) {
    root.setAttribute('data-nxgov-signature-state', value);
  }

  function alertsRegion(root) {
    var verifier = $('[data-nxgov-signature-verifier]', root);
    return (verifier && $('[data-nxgov-signature-alerts]', verifier)) || $('[data-nxgov-signature-alerts]', root);
  }

  function clearAlerts(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-nxgov-signature-alerts]'), function (region) {
      region.textContent = '';
    });
  }

  function notify(root, variant, message) {
    var region = alertsRegion(root);
    if (!region || !nxgov.alert) return null;
    region.textContent = '';
    return nxgov.alert.show(region, { variant: variant, message: message });
  }

  function invalidControls(scope) {
    if (!nxgov.form) return [];
    return Array.prototype.filter.call(scope.querySelectorAll(CONTROLS), function (c) {
      return c.offsetParent !== null && !c.readOnly && !c.disabled && !nxgov.form.validate(c);
    });
  }

  function reportInvalid(invalid) {
    invalid[0].focus();
    if (nxgov.announce) {
      nxgov.announce(invalid.length === 1 ? 'Hay 1 campo con error.' : 'Hay ' + invalid.length + ' campos con errores.', 'assertive');
    }
  }

  function collect(scope) {
    var data = {};
    Array.prototype.forEach.call(scope.querySelectorAll('input[name], select[name], textarea[name]'), function (el) {
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      data[el.name] = nxgov.form && el.hasAttribute('data-nxgov-mask') ? nxgov.form.rawValue(el) : el.value;
    });
    return data;
  }

  function emit(trigger, action, detail) {
    return nxgov.emit ? nxgov.emit(trigger, action, detail) : true;
  }

  function setSubmitEnabled(root, enabled) {
    var submit = $('[data-nxgov-signature-submit]', root);
    if (!submit) return;
    if (enabled) submit.removeAttribute('aria-disabled');
    else submit.setAttribute('aria-disabled', 'true');
  }

  function lockVerifier(root, locked) {
    var verifier = $('[data-nxgov-signature-verifier]', root);
    if (!verifier) return;
    Array.prototype.forEach.call(verifier.querySelectorAll(CONTROLS), function (c) {
      if (c.tagName === 'SELECT') c.disabled = locked;
      else c.readOnly = locked;
    });
    Array.prototype.forEach.call(verifier.querySelectorAll('input[type="radio"], input[type="checkbox"]'), function (c) {
      c.disabled = locked;
    });
    var verify = $('[data-nxgov-signature-verify]', root);
    if (verify) (verify.closest('.nxgov-signature__verify') || verify).hidden = locked;
  }

  function verify(root, trigger) {
    var verifier = $('[data-nxgov-signature-verifier]', root) || root;
    var invalid = invalidControls(verifier);
    if (invalid.length) return reportInvalid(invalid);
    var detail = { component: 'signature', id: root.getAttribute('data-nxgov-id'), data: collect(verifier) };
    if (!emit(trigger, 'verify', detail)) return;
    setState(root, 'verifying');
    if (nxgov.setBusy) nxgov.setBusy(trigger, true, MESSAGES.pending);
  }

  function submit(root, trigger) {
    if (trigger.getAttribute('aria-disabled') === 'true') {
      // Enfocable pero inactivo: se explica por qué en lugar de no hacer nada
      if (nxgov.announce) nxgov.announce('Primero verifica la identidad del contador o revisor fiscal.', 'assertive');
      var v = $('[data-nxgov-signature-verify]', root);
      if (v && v.getClientRects().length) v.focus();
      return;
    }
    var invalid = invalidControls(root);
    if (invalid.length) return reportInvalid(invalid);
    var detail = { component: 'signature', id: root.getAttribute('data-nxgov-id'), data: collect(root) };
    if (!emit(trigger, 'sign', detail)) return;
    setState(root, 'signing');
    if (nxgov.setBusy) nxgov.setBusy(trigger, true, MESSAGES.signing);
  }

  function applyResponse(rootOrId, response) {
    var root = resolve(rootOrId);
    if (!root) return;
    var res = response || {};
    var stage = state(root) === 'signing' ? 'sign' : 'verify';
    var verifyBtn = $('[data-nxgov-signature-verify]', root);
    var submitBtn = $('[data-nxgov-signature-submit]', root);
    if (nxgov.setBusy) {
      nxgov.setBusy(verifyBtn, false);
      nxgov.setBusy(submitBtn, false);
    }

    if (res.status === 'verified') {
      setState(root, 'verified');
      lockVerifier(root, true);
      setSubmitEnabled(root, true);
      notify(root, 'success', res.message || MESSAGES.verified);
      if (submitBtn) submitBtn.focus(); // "Verificar" se oculta: el foco pasa a la siguiente acción
      root.dispatchEvent(new CustomEvent('nxgov:signature:verified', { bubbles: true, detail: { id: root.getAttribute('data-nxgov-id') } }));
      return;
    }

    if (res.status === 'signed') {
      setState(root, 'signed');
      setSubmitEnabled(root, false);
      root.dispatchEvent(new CustomEvent('nxgov:signature:signed', { bubbles: true, detail: { id: root.getAttribute('data-nxgov-id') } }));
      return;
    }

    // error (o respuesta desconocida)
    setState(root, stage === 'sign' ? 'verified' : 'idle');
    notify(root, 'danger', res.message || (stage === 'sign' ? MESSAGES.signError : MESSAGES.verifyError));
    root.dispatchEvent(
      new CustomEvent('nxgov:signature:failed', { bubbles: true, detail: { id: root.getAttribute('data-nxgov-id'), stage: stage, message: res.message || '' } })
    );
  }

  function reset(rootOrId) {
    var root = resolve(rootOrId);
    if (!root) return;
    setState(root, 'idle');
    clearAlerts(root);
    lockVerifier(root, false);
    setSubmitEnabled(root, false);
    Array.prototype.forEach.call(root.querySelectorAll('[aria-busy="true"]'), function (el) {
      if (nxgov.setBusy) nxgov.setBusy(el, false);
    });
  }

  document.addEventListener('click', function (event) {
    var t = event.target instanceof Element ? event.target : null;
    var btn = t && t.closest('[data-nxgov-signature-verify], [data-nxgov-signature-submit]');
    if (!btn) return;
    var root = btn.closest('.nxgov-signature');
    if (!root || btn.getAttribute('aria-busy') === 'true') return;
    if (btn.hasAttribute('data-nxgov-signature-verify')) verify(root, btn);
    else submit(root, btn);
  });

  nxgov.signature = { applyResponse: applyResponse, reset: reset, state: state, __bound: true };
})(window, document);
