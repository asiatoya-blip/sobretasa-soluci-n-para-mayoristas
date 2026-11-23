/*
 * file-upload.js — Comportamiento de nxgov-file-upload.
 * Migración segura de GOV.CO v5 carga-archivos.js: el nombre del archivo se pinta con textContent (nunca innerHTML),
 * la validación se hace en el cliente y el envío real lo hace el CMS (formulario o servicio).
 *
 * Configuración en la raíz:
 *   data-nxgov-accept="application/pdf"     tipos MIME permitidos (coma); además se acepta la extensión .pdf
 *   data-nxgov-max-size="209715200"         bytes (200 MB)
 *
 * API:  nxgov.fileUpload.init(scope?) · .clear(rootOrId) · .file(rootOrId) → File | null
 * Eventos:
 *   nxgov:file-upload:selected   detail { name, size, type, id }
 *   nxgov:file-upload:invalid    detail { reason: 'type'|'size', id }
 *   nxgov:file-upload:cleared    detail { id }
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.fileUpload && nxgov.fileUpload.__bound) return;

  function resolve(rootOrId) {
    return typeof rootOrId === 'string' ? document.getElementById(rootOrId) : rootOrId;
  }

  function el(root, name) {
    return root.querySelector('.nxgov-file-upload__' + name);
  }

  function formatSize(bytes) {
    var mb = bytes / (1024 * 1024);
    return (mb < 0.1 ? 0.1 : mb).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' MB';
  }

  function fire(root, name, detail) {
    detail = detail || {};
    detail.id = root.id;
    root.dispatchEvent(new CustomEvent('nxgov:file-upload:' + name, { bubbles: true, detail: detail }));
  }

  function setError(root, message) {
    var input = el(root, 'input');
    var error = el(root, 'error');
    var text = error && error.querySelector('.nxgov-file-upload__error-text');
    root.classList.toggle('nxgov-is-invalid', !!message);
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) {
      error.hidden = !message;
      if (text) text.textContent = message || '';
    }
    if (message && nxgov.announce) nxgov.announce(message, 'assertive');
  }

  function validate(root, file) {
    var accept = (root.getAttribute('data-nxgov-accept') || 'application/pdf').split(',').map(function (s) { return s.trim(); });
    var max = parseInt(root.getAttribute('data-nxgov-max-size'), 10) || 0;
    var isPdfName = /\.pdf$/i.test(file.name);
    if (accept.indexOf(file.type) === -1 && !(accept.indexOf('application/pdf') !== -1 && isPdfName)) return 'type';
    if (max && file.size > max) return 'size';
    return null;
  }

  function show(root, file) {
    var box = el(root, 'file');
    el(root, 'name').textContent = file.name;
    el(root, 'meta').textContent = formatSize(file.size) + ' · Listo para enviar';
    if (box) box.hidden = false;
    root.classList.add('nxgov-is-loaded');
    var remove = el(root, 'remove');
    if (remove) remove.focus();
    if (nxgov.announce) nxgov.announce('Archivo ' + file.name + ' cargado.');
  }

  function handle(root, file) {
    if (!file) return;
    var reason = validate(root, file);
    if (reason) {
      var max = parseInt(root.getAttribute('data-nxgov-max-size'), 10) || 0;
      setError(root, reason === 'type'
        ? 'El archivo debe ser un PDF.'
        : 'El archivo supera ' + formatSize(max) + '. Carga un PDF más liviano.');
      el(root, 'input').value = '';
      root.__nxgovFile = null;
      fire(root, 'invalid', { reason: reason });
      return;
    }
    setError(root, null);
    root.__nxgovFile = file;
    show(root, file);
    fire(root, 'selected', { name: file.name, size: file.size, type: file.type });
  }

  function clear(rootOrId) {
    var root = resolve(rootOrId);
    if (!root) return;
    var input = el(root, 'input');
    input.value = '';
    root.__nxgovFile = null;
    el(root, 'file').hidden = true;
    root.classList.remove('nxgov-is-loaded');
    setError(root, null);
    input.focus();
    fire(root, 'cleared');
  }

  function bind(root) {
    if (root.__nxgovFileUpload) return;
    root.__nxgovFileUpload = true;
    var input = el(root, 'input');
    var zone = el(root, 'dropzone');
    var remove = el(root, 'remove');

    input.addEventListener('change', function () { handle(root, input.files && input.files[0]); });
    if (remove) remove.addEventListener('click', function () { clear(root); });

    ['dragenter', 'dragover'].forEach(function (type) {
      zone.addEventListener(type, function (event) {
        event.preventDefault();
        root.classList.add('nxgov-is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      zone.addEventListener(type, function (event) {
        event.preventDefault();
        if (type === 'dragleave' && zone.contains(event.relatedTarget)) return;
        root.classList.remove('nxgov-is-dragover');
      });
    });
    zone.addEventListener('drop', function (event) {
      var files = event.dataTransfer && event.dataTransfer.files;
      handle(root, files && files[0]);
    });
  }

  function init(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('[data-nxgov-component="file-upload"]'), bind);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();

  nxgov.fileUpload = {
    init: init,
    clear: clear,
    file: function (rootOrId) { var r = resolve(rootOrId); return (r && r.__nxgovFile) || null; },
    __bound: true
  };
})(window, document);
