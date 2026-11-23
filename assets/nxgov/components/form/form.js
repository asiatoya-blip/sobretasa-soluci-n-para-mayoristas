/*
 * form.js — Validación accesible y máscara de moneda para nxgov-field / nxgov-input / nxgov-select.
 * Base: patrón de GOV.CO v5 entradas-de-texto.js (aria-invalid + aria-describedby + mensaje bajo el campo),
 * corregido: ids únicos por campo (v5 repetía "campoWarning-id"), sin colorear el texto del input, sin
 * handlers en línea, mensajes desde la Constraint Validation API nativa.
 *
 * Marcado:
 *   <form data-nxgov-validate novalidate> … <div class="nxgov-field">
 *     <label class="nxgov-field__label" for="x">…</label>
 *     <div class="nxgov-input nxgov-input--currency"><span class="nxgov-input__prefix" aria-hidden="true">$</span>
 *       <input class="nxgov-input__control" id="x" inputmode="numeric" data-nxgov-mask="currency" required
 *              data-nxgov-min="1" data-nxgov-error-required="Ingresa el valor."></div>
 *     <p class="nxgov-field__error" id="x-error" hidden></p>   ← opcional: se crea si no existe
 *
 * Máscaras: data-nxgov-mask="currency" (con prefijo $) o "number" (enteros con miles, p. ej. galones).
 * Mensajes personalizados: data-nxgov-error-<required|format|min|max|date>.
 * API: nxgov.form.validate(control) · .validateForm(form) · .rawValue(input) · .formatCurrency("250000")
 * Eventos: nxgov:form:validated (detail: { valid, invalid: [controles] }) al enviar un form[data-nxgov-validate].
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.form && nxgov.form.__bound) return;

  var CONTROL = '.nxgov-input__control, .nxgov-select__control';
  var MAX_DIGITS = 15;
  var DEFAULTS = {
    required: 'Este campo es obligatorio.',
    format: 'El formato no es válido.',
    min: 'El valor es menor al mínimo permitido.',
    max: 'El valor supera el máximo permitido.',
    date: 'Ingresa una fecha válida.',
  };
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---------- Moneda (es-CO: separador de miles ".") ---------- */
  function digitsOf(value) {
    return String(value || '').replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS);
  }

  function formatCurrency(value) {
    var digits = digitsOf(value);
    return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  }

  function isNumericMask(input) {
    var mask = input.getAttribute('data-nxgov-mask');
    return mask === 'currency' || mask === 'number';
  }

  function rawValue(input) {
    return isNumericMask(input) ? digitsOf(input.value) : input.value;
  }

  /* Reformatea conservando la posición del cursor respecto a los dígitos (no a los separadores). */
  function applyCurrencyMask(input) {
    var caret = input.selectionStart == null ? input.value.length : input.selectionStart;
    var digitsBefore = digitsOf(input.value.slice(0, caret)).length;
    var formatted = formatCurrency(input.value);
    if (formatted === input.value) return;
    input.value = formatted;
    var pos = 0;
    var seen = 0;
    while (pos < formatted.length && seen < digitsBefore) {
      if (/\d/.test(formatted[pos])) seen++;
      pos++;
    }
    if (document.activeElement === input) input.setSelectionRange(pos, pos);
  }

  /* ---------- Mensajes de error ---------- */
  function errorElement(control) {
    var field = control.closest('.nxgov-field');
    if (!field) return null;
    var err = field.querySelector('.nxgov-field__error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'nxgov-field__error';
      err.hidden = true;
      field.appendChild(err);
    }
    if (!err.id) err.id = (control.id || 'nxgov-field-' + Math.random().toString(36).slice(2, 8)) + '-error';
    return err;
  }

  function setDescribedBy(control, id, add) {
    var ids = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    var has = ids.indexOf(id) !== -1;
    if (add && !has) ids.push(id);
    if (!add && has) ids.splice(ids.indexOf(id), 1);
    if (ids.length) control.setAttribute('aria-describedby', ids.join(' '));
    else control.removeAttribute('aria-describedby');
  }

  function showError(control, message) {
    var err = errorElement(control);
    if (!err) return;
    err.textContent = '';
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'nxgov-field__error-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#nxgov-icon-error');
    svg.appendChild(use);
    var text = document.createElement('span');
    text.textContent = message;
    err.appendChild(svg);
    err.appendChild(text);
    err.hidden = false;
    control.setAttribute('aria-invalid', 'true');
    setDescribedBy(control, err.id, true);
  }

  function clearError(control) {
    var field = control.closest('.nxgov-field');
    var err = field && field.querySelector('.nxgov-field__error');
    control.removeAttribute('aria-invalid');
    if (err) {
      err.hidden = true;
      err.textContent = '';
      if (err.id) setDescribedBy(control, err.id, false);
    }
  }

  function message(control, key) {
    return control.getAttribute('data-nxgov-error-' + key) || DEFAULTS[key];
  }

  /* ---------- Validación ---------- */
  function validate(control) {
    if (control.disabled || control.readOnly) {
      clearError(control);
      return true;
    }
    control.setCustomValidity('');

    // Reglas propias de moneda (el input es type="text" para poder formatear)
    if (isNumericMask(control) && control.value) {
      var n = Number(digitsOf(control.value));
      var min = control.getAttribute('data-nxgov-min');
      var max = control.getAttribute('data-nxgov-max');
      if (min !== null && n < Number(min)) control.setCustomValidity(message(control, 'min'));
      else if (max !== null && n > Number(max)) control.setCustomValidity(message(control, 'max'));
    }

    if (control.checkValidity()) {
      clearError(control);
      return true;
    }

    var v = control.validity;
    var key = v.valueMissing ? 'required'
      : v.badInput && control.type === 'date' ? 'date'
      : v.rangeUnderflow ? 'min'
      : v.rangeOverflow ? 'max'
      : v.customError ? null
      : 'format';
    showError(control, key ? message(control, key) : control.validationMessage);
    return false;
  }

  function validateForm(form) {
    var controls = Array.prototype.slice.call(form.querySelectorAll(CONTROL));
    var invalid = controls.filter(function (c) {
      return !validate(c);
    });
    form.dispatchEvent(
      new CustomEvent('nxgov:form:validated', { bubbles: true, detail: { valid: !invalid.length, invalid: invalid } })
    );
    return invalid;
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('input', function (event) {
    var c = event.target;
    if (!(c instanceof Element) || !c.matches(CONTROL)) return;
    c.setAttribute('data-nxgov-dirty', '');
    if (isNumericMask(c)) applyCurrencyMask(c);
    if (c.getAttribute('aria-invalid') === 'true') validate(c); // corrige en vivo una vez marcado
  });

  document.addEventListener('change', function (event) {
    var c = event.target;
    if (c instanceof Element && c.matches('.nxgov-select__control')) {
      c.setAttribute('data-nxgov-dirty', '');
      validate(c);
    }
  });

  // Al salir del campo: valida solo si el usuario lo modificó (evita errores prematuros al tabular)
  document.addEventListener('focusout', function (event) {
    var c = event.target;
    if (c instanceof Element && c.matches(CONTROL) && c.hasAttribute('data-nxgov-dirty')) validate(c);
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-nxgov-validate')) return;
    var invalid = validateForm(form);
    if (invalid.length) {
      event.preventDefault();
      invalid[0].focus(); // el lector lee etiqueta + error (aria-describedby)
      if (nxgov.announce) {
        nxgov.announce(
          invalid.length === 1 ? 'Hay 1 campo con error.' : 'Hay ' + invalid.length + ' campos con errores.',
          'assertive'
        );
      }
    }
  });

  document.addEventListener('reset', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    Array.prototype.forEach.call(form.querySelectorAll(CONTROL), function (c) {
      c.removeAttribute('data-nxgov-dirty');
      clearError(c);
    });
  });

  function init(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('[data-nxgov-mask="currency"], [data-nxgov-mask="number"]'), function (c) {
      c.value = formatCurrency(c.value);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();

  nxgov.form = {
    init: init,
    validate: validate,
    validateForm: validateForm,
    rawValue: rawValue,
    formatCurrency: formatCurrency,
    __bound: true,
  };
})(window, document);
