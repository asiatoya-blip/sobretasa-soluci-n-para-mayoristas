/*
 * table.js — Comportamiento genérico de nxgov-table (requiere emit.js para anuncios; form.js para máscaras).
 *
 * 1) Agregar filas (anexo de lotes / "Agregar dispersión"):
 *      <tbody id="anexo-2" data-nxgov-table-label="Dispersión"> <tr data-nxgov-row="1"> … </tr> </tbody>
 *      <button data-nxgov-table-add="anexo-2">Agregar dispersión</button>
 *    Clona la última fila, renumera (texto "Dispersión N", ids "-N", aria-labelledby y data-label), vacía los
 *    inputs, anima la entrada, mueve el foco al primer input y lo anuncia. Evento: nxgov:table:row-added.
 *
 * 2) Utilidades de cálculo (la lógica de negocio vive en la aplicación):
 *      nxgov.table.number(elOrValue)      → número desde input/celda formateada es-CO ("1.234,5" → 1234.5)
 *      nxgov.table.format(n, {currency})  → "$ 1.234.567" / "1.234.567" (redondeo a entero, es-CO)
 *      nxgov.table.set(el, n, {currency}) → escribe el valor formateado en una celda/elemento
 *      nxgov.table.sum(scope, selector)   → suma de los valores de los elementos que coinciden
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.table && nxgov.table.__bound) return;

  var FMT = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

  function number(elOrValue) {
    var raw = elOrValue && elOrValue.nodeType === 1
      ? ('value' in elOrValue && elOrValue.tagName !== 'DATA' ? elOrValue.value : elOrValue.getAttribute('value') || elOrValue.textContent)
      : elOrValue;
    var s = String(raw == null ? '' : raw).replace(/[^\d,.-]/g, '');
    // es-CO: "." miles, "," decimales
    s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  function format(n, opts) {
    var txt = FMT.format(Math.round(n || 0));
    return opts && opts.currency ? '$ ' + txt : txt;
  }

  function set(el, n, opts) {
    if (!el) return;
    var txt = format(n, opts);
    if (el.tagName === 'DATA') el.setAttribute('value', String(Math.round(n || 0)));
    if ('value' in el && el.tagName === 'INPUT') el.value = txt;
    else el.textContent = txt;
  }

  function sum(scope, selector) {
    return Array.prototype.reduce.call((scope || document).querySelectorAll(selector), function (acc, el) {
      return acc + number(el);
    }, 0);
  }

  /* ---------- Agregar fila ---------- */
  function renumber(row, from, to, label) {
    var re = new RegExp('-' + from + '(?=\\b|-|$)', 'g');
    Array.prototype.forEach.call(row.querySelectorAll('[id]'), function (el) {
      el.id = el.id.replace(re, '-' + to);
    });
    Array.prototype.forEach.call(row.querySelectorAll('[aria-labelledby], [aria-describedby], [for]'), function (el) {
      ['aria-labelledby', 'aria-describedby', 'for'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (v) el.setAttribute(attr, v.replace(re, '-' + to));
      });
    });
    var head = row.querySelector('[data-nxgov-row-label]');
    if (head && label) head.textContent = label + ' ' + to;
    row.setAttribute('data-nxgov-row', String(to));
  }

  function addRow(tbodyOrId) {
    var tbody = typeof tbodyOrId === 'string' ? document.getElementById(tbodyOrId) : tbodyOrId;
    if (!tbody) return null;
    var rows = tbody.querySelectorAll(':scope > tr[data-nxgov-row]');
    var last = rows[rows.length - 1];
    if (!last) return null;

    var from = parseInt(last.getAttribute('data-nxgov-row'), 10) || rows.length;
    var to = from + 1;
    var clone = last.cloneNode(true);
    renumber(clone, from, to, tbody.getAttribute('data-nxgov-table-label'));

    Array.prototype.forEach.call(clone.querySelectorAll('input, select, textarea'), function (c) {
      if (!c.readOnly) c.value = '';
      c.removeAttribute('aria-invalid');
      c.removeAttribute('data-nxgov-dirty');
    });
    Array.prototype.forEach.call(clone.querySelectorAll('.nxgov-field__error'), function (e) { e.remove(); });
    Array.prototype.forEach.call(clone.querySelectorAll('[data-nxgov-calc]'), function (c) {
      set(c, 0, { currency: c.getAttribute('data-nxgov-calc') === 'currency' });
    });

    clone.classList.add('nxgov-is-entering');
    last.after(clone);
    clone.addEventListener('animationend', function () { clone.classList.remove('nxgov-is-entering'); }, { once: true });

    var first = clone.querySelector('input:not([readonly]), select, textarea');
    if (first) first.focus();

    var head = clone.querySelector('[data-nxgov-row-label]');
    if (nxgov.announce) nxgov.announce((head ? head.textContent.trim() : 'Fila') + ' agregada.');
    tbody.dispatchEvent(new CustomEvent('nxgov:table:row-added', { bubbles: true, detail: { row: clone, index: to, tbody: tbody } }));
    return clone;
  }

  document.addEventListener('click', function (event) {
    var btn = event.target instanceof Element ? event.target.closest('[data-nxgov-table-add]') : null;
    if (btn) addRow(btn.getAttribute('data-nxgov-table-add'));
  });

  nxgov.table = { addRow: addRow, number: number, format: format, set: set, sum: sum, __bound: true };
})(window, document);
