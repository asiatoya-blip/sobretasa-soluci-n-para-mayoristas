/*
 * pagination.js — nxgov-pagination. Algoritmo de ventana migrado del CDN v4 (paginacion.js): siempre primera y última,
 * actual ±1 (se amplía en los extremos para mostrar 3), elipsis cuando hay hueco; ≤5 páginas → todas.
 * Corregido frente a v4: sin javascript:void/onclick en línea ni innerHTML con datos, aria-current="page",
 * aria-disabled en Anterior/Siguiente, nombres accesibles "Página N", sin ids fijos (varias instancias).
 *
 * Uso:
 *   Servidor (recomendado): el CMS pinta los enlaces reales (href="?pagina=2"); no hace falta JS.
 *   Cliente: nxgov.pagination.render(nav, { current: 1, total: 3, href: function (p) { return '?pagina=' + p; } })
 *            Al pulsar una página emite `nxgov:action:page` (cancelable, detail.page). Si nadie lo cancela,
 *            el enlace navega a su href; para paginar en cliente, escuchar y llamar a preventDefault().
 * API: nxgov.pagination.render(nav, opts) · nxgov.pagination.pages(current, total) → [1, '…', 4, 5, 6, '…', 9]
 */
(function (window, document) {
  'use strict';

  var nxgov = (window.nxgov = window.nxgov || {});
  if (nxgov.pagination && nxgov.pagination.__bound) return;

  function pages(current, total) {
    var list = [];
    var p;
    if (total <= 5) {
      for (p = 1; p <= total; p++) list.push(p);
      return list;
    }
    var before = current - 1;
    var after = current + 1;
    if (current === 1) after += 2;
    else if (current === 2) after += 1;
    if (current === total) before -= 2;
    else if (current === total - 1) before -= 1;
    if (current > 2) {
      list.push(1);
      if (current > 3) list.push('…');
    }
    for (p = Math.max(before, 1); p <= Math.min(after, total); p++) list.push(p);
    if (current < total - 1) {
      if (current < total - 2) list.push('…');
      list.push(total);
    }
    return list;
  }

  function link(text, page, opts, extra) {
    var a = document.createElement('a');
    a.className = 'nxgov-pagination__link' + (extra && extra.step ? ' nxgov-pagination__link--step' : '');
    a.textContent = text;
    if (extra && extra.disabled) {
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('role', 'link');
    } else {
      a.href = opts.href ? opts.href(page) : '#pagina-' + page;
      a.setAttribute('data-nxgov-page', String(page));
    }
    if (extra && extra.current) a.setAttribute('aria-current', 'page');
    if (extra && extra.label) a.setAttribute('aria-label', extra.label);
    return a;
  }

  function render(nav, opts) {
    var current = Math.max(1, Math.min(opts.current || 1, opts.total || 1));
    var total = Math.max(1, opts.total || 1);
    var ul = nav.querySelector('.nxgov-pagination__list');
    if (!ul) {
      ul = document.createElement('ul');
      ul.className = 'nxgov-pagination__list';
      nav.appendChild(ul);
    }
    ul.textContent = '';
    nav.hidden = total <= 1 && opts.hideSingle !== false;

    function item(child) {
      var li = document.createElement('li');
      li.appendChild(child);
      ul.appendChild(li);
    }

    item(link('Anterior', current - 1, opts, { step: true, disabled: current === 1, label: 'Página anterior' }));
    pages(current, total).forEach(function (p) {
      if (p === '…') {
        var span = document.createElement('span');
        span.className = 'nxgov-pagination__ellipsis';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = '…';
        item(span);
      } else {
        item(link(String(p), p, opts, { current: p === current, label: 'Página ' + p + (p === current ? ', página actual' : '') }));
      }
    });
    item(link('Siguiente', current + 1, opts, { step: true, disabled: current === total, label: 'Página siguiente' }));
    nav.setAttribute('data-nxgov-current', String(current));
    nav.setAttribute('data-nxgov-total', String(total));
  }

  document.addEventListener('click', function (event) {
    var a = event.target instanceof Element ? event.target.closest('.nxgov-pagination__link') : null;
    if (!a) return;
    if (a.getAttribute('aria-disabled') === 'true' || a.getAttribute('aria-current') === 'page') {
      event.preventDefault();
      return;
    }
    var page = parseInt(a.getAttribute('data-nxgov-page'), 10);
    if (!page || !nxgov.emit) return;
    if (!nxgov.emit(a, 'page', { component: 'pagination', page: page })) event.preventDefault();
  });

  nxgov.pagination = { render: render, pages: pages, __bound: true };
})(window, document);
