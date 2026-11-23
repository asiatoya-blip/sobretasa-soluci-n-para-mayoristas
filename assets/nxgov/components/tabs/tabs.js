/*
 * tabs.js — Comportamiento de nxgov-tabs (patrón WAI-ARIA "Tabs with automatic activation").
 * Teclado: ←/→ cambian de pestaña (con ciclo), Inicio/Fin van a la primera/última; tabindex itinerante.
 *
 * Marcado: ver tabs.html. El servidor marca la pestaña inicial con aria-selected="true"; el JS normaliza el resto.
 *
 * API:  nxgov.tabs.select(rootOrId, tabOrIndex) · .init(scope?)
 * Eventos:
 *   nxgov:action:tab        (cancelable) el usuario elige una pestaña → detail { to, id }
 *   nxgov:tabs:changed      la pestaña activa cambió → detail { from, to, id }
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.tabs && nxgov.tabs.__bound) return;

  function resolve(rootOrId) {
    return typeof rootOrId === 'string' ? document.getElementById(rootOrId) : rootOrId;
  }

  function tabsOf(root) {
    return Array.prototype.slice.call(root.querySelectorAll('.nxgov-tabs__tab'));
  }

  function panelOf(tab) {
    return document.getElementById(tab.getAttribute('aria-controls'));
  }

  function activeIndex(root) {
    var tabs = tabsOf(root);
    for (var i = 0; i < tabs.length; i++) if (tabs[i].getAttribute('aria-selected') === 'true') return i;
    return 0;
  }

  function apply(root, index) {
    tabsOf(root).forEach(function (tab, i) {
      var selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      var panel = panelOf(tab);
      if (panel) panel.hidden = !selected;
    });
  }

  function select(rootOrId, tabOrIndex, opts) {
    var root = resolve(rootOrId);
    if (!root) return false;
    var tabs = tabsOf(root);
    var to = typeof tabOrIndex === 'number' ? tabOrIndex : tabs.indexOf(tabOrIndex);
    if (to < 0 || to >= tabs.length) return false;
    var from = activeIndex(root);
    var fromUser = opts && opts.user;
    if (fromUser && nxgov.emit && nxgov.emit(tabs[to], 'tab', { to: to, id: root.id }) === false) return false;
    apply(root, to);
    if (opts && opts.focus) tabs[to].focus();
    if (from !== to) {
      root.dispatchEvent(new CustomEvent('nxgov:tabs:changed', { bubbles: true, detail: { from: from, to: to, id: root.id } }));
    }
    return true;
  }

  function onClick(event) {
    var tab = event.target.closest('.nxgov-tabs__tab');
    if (!tab) return;
    select(tab.closest('.nxgov-tabs'), tab, { user: true });
  }

  function onKeydown(event) {
    var tab = event.target.closest('.nxgov-tabs__tab');
    if (!tab) return;
    var root = tab.closest('.nxgov-tabs');
    var tabs = tabsOf(root);
    var i = tabs.indexOf(tab);
    var to = null;
    if (event.key === 'ArrowRight') to = (i + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') to = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = tabs.length - 1;
    if (to === null) return;
    event.preventDefault();
    select(root, to, { user: true, focus: true });
  }

  function init(scope) {
    var roots = (scope || document).querySelectorAll('[data-nxgov-component="tabs"]');
    Array.prototype.forEach.call(roots, function (root) {
      if (root.__nxgovTabs) return;
      root.__nxgovTabs = true;
      apply(root, activeIndex(root));
      root.addEventListener('click', onClick);
      root.addEventListener('keydown', onKeydown);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();

  nxgov.tabs = { init: init, select: select, __bound: true };
})(window, document);
