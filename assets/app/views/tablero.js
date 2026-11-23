// Tablero del periodo: pestañas Declaraciones del periodo · Entidades disponibles · Grupos de firma.
import * as store from '../store.js';
import { ENTIDADES, MESES } from '../config.js';
import { periodoVigente, periodoCorto, fechaLimite } from '../calc.js';
import { esc, pesos, num, fecha, periodo, ESTADOS, ESTADOS_GRUPO, tag, icon, btn, linkBtn, aviso, notificar, breadcrumb, helpPanel, modal, panel, cerrarPanel } from '../ui.js';
import { ui, takeFlash } from '../flash.js';
import { render } from '../main.js';

const POR_PAGINA = 6;

export function encabezado(tab) {
  const s = store.getState(), hoy = store.hoy();
  const P = periodoVigente(hoy);
  const delP = s.declaraciones.filter((d) => d.anio === P.anio && d.mes === P.mes);
  const sinDeclarar = ENTIDADES.filter((e) => !delP.some((d) => d.dane === e.dane)).length;
  const porPagar = s.declaraciones.filter((d) => d.estado !== 'pagada');
  const limiteAlc = new Date(P.anio, P.mes, 8, 23, 59, 59);
  const dias = Math.ceil((limiteAlc - hoy) / 86400000);
  const sig = periodoVigente(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 15));
  const ventana = hoy <= limiteAlc
    ? `Ventana de presentación de las alcaldías: del 1 al 8 de ${MESES[(P.mes) % 12]} · Quedan ${dias} ${dias === 1 ? 'día' : 'días'}. Las gobernaciones tienen plazo hasta el día 15.`
    : `La ventana de las alcaldías cerró el ${fecha(limiteAlc.toISOString())}: las declaraciones de ${periodoCorto(P).toLowerCase()} se liquidan con la sanción por extemporaneidad de cada entidad. La próxima ventana (${periodoCorto(sig).toLowerCase()}) es del 1 al 8 de ${MESES[sig.mes % 12]}.`;
  const kpi = (et, val, apoyo) => `<div class="app-kpi"><p class="app-kpi__label">${et}</p><p class="app-kpi__value">${val}</p><p class="app-kpi__help">${apoyo}</p></div>`;
  const tabLink = (id, label, ic, href) => `<a class="nxgov-tabs__tab" href="${href}" ${tab === id ? 'aria-current="page"' : ''}>${icon(ic, 'nxgov-tabs__icon')}<span class="nxgov-tabs__label">${label}</span></a>`;
  return `
    ${breadcrumb([{ label: 'Inicio', href: '#/' }, { label: 'Declaraciones masivas de sobretasa' }])}
    <div class="app-pagehead">
      <div><h1 class="app-title" tabindex="-1">Declaraciones masivas de sobretasa a la gasolina</h1>
      <p class="app-lead">Declara ante varias entidades en un solo paso: carga tu archivo, revisa, firma y paga desde un solo lugar.</p></div>
      ${linkBtn('Nueva carga masiva', '#/carga', { variant: 'primary', iconName: 'upload' })}
    </div>
    <section class="nxgov-context-bar" aria-labelledby="empresa-title">
      <span class="nxgov-context-bar__badge" aria-hidden="true">${icon('store', 'nxgov-context-bar__icon')}</span>
      <div class="nxgov-context-bar__body"><p class="nxgov-context-bar__eyebrow">Empresa declarante</p>
        <h2 class="nxgov-context-bar__title" id="empresa-title">${esc(s.empresa?.razonSocial || 'Distribuidora Andina de Combustibles S.A.S.')}</h2>
        <p class="nxgov-context-bar__meta">NIT 900.123.456-7 · Distribuidor mayorista</p></div>
      <button type="button" class="nxgov-button nxgov-button--outline nxgov-context-bar__action" data-app-config>${icon('cog')}<span class="nxgov-button__label">Configuración</span></button>
    </section>
    <section class="app-card app-periodo" aria-labelledby="periodo-title">
      <div class="nxgov-section-heading"><span class="nxgov-section-heading__icon" aria-hidden="true">${icon('calendar', 'nxgov-section-heading__glyph')}</span>
        <div class="nxgov-section-heading__text"><h2 class="nxgov-section-heading__title" id="periodo-title">Periodo gravable: ${periodoCorto(P).toLowerCase()}</h2>
        <p class="nxgov-section-heading__description">${esc(ventana)}</p></div></div>
      <div class="app-kpis">
        ${kpi('Entidades con responsabilidad', ENTIDADES.length, 'Inscritas en la consola administrativa')}
        ${kpi(`Declaraciones de ${MESES[P.mes - 1]}`, delP.length, `${delP.filter((d) => d.estado === 'firmada' || d.estado === 'pagada').length} firmadas · ${delP.filter((d) => d.estado === 'pagada').length} pagadas`)}
        ${kpi('Entidades sin declarar', sinDeclarar, `En ${MESES[P.mes - 1]} de ${P.anio}`)}
        ${kpi('Total por pagar', pesos(porPagar.reduce((a, d) => a + d.liq.total, 0)), `${porPagar.length} declaraciones sin pagar`)}
      </div>
    </section>
    ${helpPanel('¿Primera vez haciendo una carga masiva?')}
    <nav class="nxgov-tabs app-tabs" aria-label="Secciones del tablero"><div class="nxgov-tabs__list">
      ${tabLink('declaraciones', 'Declaraciones del periodo', 'file-alt', '#/declaraciones')}
      ${tabLink('entidades', `Entidades disponibles (${ENTIDADES.length})`, 'store', '#/entidades')}
      ${tabLink('grupos', `Grupos de firma (${s.grupos.length})`, 'layer-group', '#/grupos')}
    </div></nav>`;
}

export function vistaTablero(tab) {
  const flash = takeFlash();
  const cuerpo = tab === 'entidades' ? entidades() : tab === 'grupos' ? grupos() : declaraciones();
  return {
    titulo: 'Tablero del periodo',
    html: `${encabezado(tab)}<div class="app-tabpanel">${cuerpo}</div>`,
    bind: (root) => { if (tab === 'declaraciones') bindDeclaraciones(root); },
    after: () => { if (flash) notificar(flash.variant, flash.message, flash.title); },
  };
}

// ---------- Declaraciones ----------
function filtros() {
  if (!ui.filtros) { const P = periodoVigente(store.hoy()); ui.filtros = { anio: String(P.anio), mes: String(P.mes), estado: '', q: '' }; }
  return ui.filtros;
}

function filtradas() {
  const f = filtros();
  const q = f.q.trim().toLowerCase();
  return store.getState().declaraciones
    .filter((d) => (!f.anio || d.anio === Number(f.anio)) && (!f.mes || d.mes === Number(f.mes)) && (!f.estado || d.estado === f.estado))
    .filter((d) => { if (!q) return true; const e = store.ent(d.dane); return e.nombre.toLowerCase().includes(q) || d.dane.includes(q) || e.depto.toLowerCase().includes(q); })
    .sort((a, b) => (b.anio * 100 + b.mes) - (a.anio * 100 + a.mes) || ['borrador', 'pendiente', 'firmada', 'pagada'].indexOf(a.estado) - ['borrador', 'pendiente', 'firmada', 'pagada'].indexOf(b.estado) || b.numero - a.numero);
}

const seleccionable = (d) => d.estado === 'borrador' && (!d.grupoId || store.grupoEditable(store.grupo(d.grupoId)));

function declaraciones() {
  const f = filtros(), s = store.getState();
  const anios = [...new Set([periodoVigente(store.hoy()).anio, ...s.declaraciones.map((d) => d.anio)])].sort().reverse();
  const opt = (v, l, sel) => `<option value="${v}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
  const select = (id, label, opciones) => `<div class="nxgov-field"><label class="nxgov-field__label" for="${id}">${label}</label><div class="nxgov-select"><select class="nxgov-select__control" id="${id}">${opciones}</select>${icon('chevron-down', 'nxgov-select__icon')}</div></div>`;
  return `
    <div class="app-filtros" role="group" aria-label="Filtrar declaraciones">
      ${select('f-anio', 'Año', opt('', 'Todos', f.anio) + anios.map((a) => opt(a, a, f.anio)).join(''))}
      ${select('f-mes', 'Mes', opt('', 'Todos', f.mes) + MESES.map((m, i) => opt(i + 1, m[0].toUpperCase() + m.slice(1), f.mes)).join(''))}
      ${select('f-estado', 'Estado', opt('', 'Todos los estados', f.estado) + Object.entries(ESTADOS).map(([k, v]) => opt(k, v.texto, f.estado)).join(''))}
      <form class="nxgov-search app-filtros__buscar" role="search" id="f-buscar-form"><label class="nxgov-sr-only" for="f-q">Buscar entidad o código DANE</label>
        <input class="nxgov-search__input" id="f-q" type="search" placeholder="Buscar entidad o código DANE" value="${esc(f.q)}" autocomplete="off">
        <button class="nxgov-search__button" type="submit">${icon('search', 'nxgov-search__icon')}<span class="nxgov-sr-only">Buscar</span></button></form>
    </div>
    <div id="barra-seleccion"></div>
    <p class="nxgov-sr-only" role="status" id="estado-lista"></p>
    <div id="lista-declaraciones"></div>`;
}

function tarjeta(d) {
  const e = store.ent(d.dane), est = ESTADOS[d.estado], titulo = `${e.nombre}, ${periodo(d)}`;
  const g = d.grupoId ? store.grupo(d.grupoId) : null;
  const sel = seleccionable(d);
  let acciones = '';
  if (d.estado === 'borrador') acciones = btn('Firmar', { variant: 'primary', iconName: 'signature', sr: titulo, attrs: `data-firmar="${d.id}"` });
  if (d.estado === 'firmada') acciones = btn('Pagar', { variant: 'primary', iconName: 'money-bill', sr: titulo, attrs: `data-ir="#/pago/${d.id}"` });
  if (d.estado === 'pendiente') acciones = btn('Ver grupo', { iconName: 'layer-group', sr: titulo, attrs: `data-ir="#/grupo/${g?.id}"` });
  acciones += d.estado === 'pagada'
    ? btn('Ver comprobante', { iconName: 'file-alt', sr: titulo, attrs: `data-ir="#/pago/${d.id}/comprobante"` })
    : btn('Ver', { iconName: 'eye', sr: titulo, attrs: `data-ir="#/declaracion/${d.id}"` });
  acciones += btn('PDF', { iconName: 'download', sr: `de la declaración ${titulo}`, attrs: `data-pdf="${d.id}"` });
  if (d.estado === 'borrador') acciones += btn('Eliminar', { variant: 'danger', iconName: 'trash', sr: titulo, attrs: `data-eliminar="${d.id}"` });
  const mensaje = `${est.mensaje}${d.liq.extemporanea ? ` Incluye sanción por extemporaneidad de ${pesos(d.liq.sancion)}.` : ''}${g ? ` Grupo: ${g.nombre}.` : ''}`;
  return `<li class="app-seleccionable">
    <div class="app-seleccionable__check">${sel
      ? `<input type="checkbox" class="app-check" id="sel-${d.id}" data-sel="${d.id}" ${ui.seleccion.has(d.id) ? 'checked' : ''}><label class="nxgov-sr-only" for="sel-${d.id}">Seleccionar ${esc(titulo)}</label>`
      : `<input type="checkbox" class="app-check" disabled aria-label="${esc(titulo)}: solo se agrupan borradores que no están en firma">`}</div>
    <article class="nxgov-declaration-list-item" data-nxgov-status="${d.estado}" aria-labelledby="t-${d.id}">
      <div class="nxgov-declaration-list-item__summary">
        <div class="nxgov-declaration-list-item__cell--period"><h3 class="nxgov-declaration-list-item__period" id="t-${d.id}">${esc(e.nombre)}</h3>
          <p class="nxgov-declaration-list-item__created">${esc(e.depto)} · DANE ${esc(d.dane)} · ${periodo(d)} · N.° ${d.numero}</p></div>
        <dl class="nxgov-declaration-list-item__details">
          <div class="nxgov-declaration-list-item__field"><dt class="nxgov-declaration-list-item__label">Galones</dt><dd class="nxgov-declaration-list-item__value">${num(d.liq.galones)}</dd></div>
          <div class="nxgov-declaration-list-item__field"><dt class="nxgov-declaration-list-item__label">Total a pagar</dt><dd class="nxgov-declaration-list-item__value"><data class="nxgov-declaration-list-item__amount" value="${d.liq.total}">${pesos(d.liq.total)}</data></dd></div>
          <div class="nxgov-declaration-list-item__field"><dt class="nxgov-declaration-list-item__label">Estado</dt><dd class="nxgov-declaration-list-item__value">${tag(est.texto, est.tag)}</dd></div>
        </dl></div>
      <div class="nxgov-declaration-list-item__footer"><p class="nxgov-declaration-list-item__message">${icon('info', 'nxgov-declaration-list-item__message-icon')}${esc(mensaje)}</p>
        <div class="nxgov-declaration-list-item__actions" role="group" aria-label="Acciones de ${esc(titulo)}">${acciones}</div></div>
    </article></li>`;
}

function pintarLista(root) {
  const todas = filtradas();
  const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
  ui.pagina = Math.min(ui.pagina, paginas);
  const desde = (ui.pagina - 1) * POR_PAGINA, items = todas.slice(desde, desde + POR_PAGINA);
  const pag = paginas > 1 ? `<nav class="nxgov-pagination" aria-label="Paginación de declaraciones"><ul class="nxgov-pagination__list">
      <li><a class="nxgov-pagination__link nxgov-pagination__link--step" ${ui.pagina === 1 ? 'role="link" aria-disabled="true"' : `href="#" data-pag="${ui.pagina - 1}"`} aria-label="Página anterior">Anterior</a></li>
      ${Array.from({ length: paginas }, (_, i) => i + 1).map((p) => `<li><a class="nxgov-pagination__link" href="#" data-pag="${p}" ${p === ui.pagina ? 'aria-current="page"' : ''} aria-label="Página ${p}${p === ui.pagina ? ', página actual' : ''}">${p}</a></li>`).join('')}
      <li><a class="nxgov-pagination__link nxgov-pagination__link--step" ${ui.pagina === paginas ? 'role="link" aria-disabled="true"' : `href="#" data-pag="${ui.pagina + 1}"`} aria-label="Página siguiente">Siguiente</a></li></ul></nav>` : '';
  root.querySelector('#lista-declaraciones').innerHTML = items.length
    ? `<ul class="app-lista" role="list">${items.map(tarjeta).join('')}</ul><div class="app-paginacion"><p>Mostrando ${desde + 1} a ${desde + items.length} de ${todas.length} declaraciones</p>${pag}</div>`
    : `<div class="nxgov-empty-state"><span class="nxgov-empty-state__badge" aria-hidden="true">${icon('file-alt', 'nxgov-empty-state__icon')}</span><h3 class="nxgov-empty-state__title">${store.getState().declaraciones.length ? 'No hay declaraciones con estos filtros' : 'Aún no tienes declaraciones'}</h3><p class="nxgov-empty-state__text">${store.getState().declaraciones.length ? 'Cambia el año, el mes o el estado, o haz una nueva carga masiva.' : 'Descarga la plantilla, diligénciala con tus ventas del periodo y súbela en «Nueva carga masiva».'}</p><div class="nxgov-empty-state__actions">${linkBtn('Nueva carga masiva', '#/carga', { variant: 'primary', iconName: 'upload' })}</div></div>`;
  root.querySelector('#estado-lista').textContent = `${todas.length} declaraciones encontradas`;
  pintarBarra(root);
}

function pintarBarra(root) {
  const ids = [...ui.seleccion].filter((id) => { const d = store.declaracion(id); return d && seleccionable(d); });
  ui.seleccion = new Set(ids);
  const cont = root.querySelector('#barra-seleccion');
  if (!ids.length) { cont.innerHTML = ''; return; }
  const total = ids.reduce((a, id) => a + store.declaracion(id).liq.total, 0);
  cont.innerHTML = `<div class="app-barra" role="region" aria-label="Declaraciones seleccionadas" aria-live="polite">
    <div class="app-barra__texto"><p class="app-barra__titulo">${ids.length} ${ids.length === 1 ? 'declaración seleccionada' : 'declaraciones seleccionadas'}</p><p class="app-barra__sub">Total ${pesos(total)} · solo se agrupan declaraciones en borrador</p></div>
    <div class="app-barra__acciones">${btn('Quitar selección', { attrs: 'data-limpiar' })}${btn('Agregar a un grupo existente', { iconName: 'plus', attrs: 'data-agregar-grupo' })}${btn('Crear grupo de firma', { variant: 'primary', iconName: 'layer-group', attrs: 'data-crear-grupo' })}</div></div>`;
}

function bindDeclaraciones(root) {
  pintarLista(root);
  const f = filtros();
  const cambio = () => { ui.pagina = 1; pintarLista(root); };
  root.querySelector('#f-anio').addEventListener('change', (e) => { f.anio = e.target.value; cambio(); });
  root.querySelector('#f-mes').addEventListener('change', (e) => { f.mes = e.target.value; cambio(); });
  root.querySelector('#f-estado').addEventListener('change', (e) => { f.estado = e.target.value; cambio(); });
  root.querySelector('#f-q').addEventListener('input', (e) => { f.q = e.target.value; cambio(); });
  root.querySelector('#f-buscar-form').addEventListener('submit', (e) => { e.preventDefault(); cambio(); });

  root.addEventListener('change', (e) => {
    const id = e.target.dataset?.sel; if (!id) return;
    e.target.checked ? ui.seleccion.add(id) : ui.seleccion.delete(id);
    pintarBarra(root);
  });
  root.addEventListener('click', async (e) => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.pag) { e.preventDefault(); ui.pagina = Number(t.dataset.pag); pintarLista(root); root.querySelector('#lista-declaraciones h3')?.scrollIntoView({ block: 'center' }); return; }
    if (t.dataset.ir) { location.hash = t.dataset.ir; return; }
    if (t.dataset.pdf) { location.hash = `#/declaracion/${t.dataset.pdf}?imprimir=1`; return; }
    if (t.dataset.firmar) { irAFirmar(t.dataset.firmar); return; }
    if (t.dataset.eliminar) { eliminar(t.dataset.eliminar); return; }
    if ('limpiar' in t.dataset) { ui.seleccion.clear(); pintarLista(root); return; }
    if ('crearGrupo' in t.dataset) { crearGrupo(); return; }
    if ('agregarGrupo' in t.dataset) { agregarAGrupo(root); }
  });
}

function irAFirmar(id) {
  const d = store.declaracion(id);
  if (d.grupoId) { location.hash = `#/grupo/${d.grupoId}`; return; }
  const g = store.crearGrupo([id], `Grupo ${store.ent(d.dane).nombre}`);
  location.hash = `#/grupo/${g.id}`;
}

function eliminar(id) {
  const d = store.declaracion(id), e = store.ent(d.dane);
  modal({ variante: 'warning', icono: 'warning', titulo: '¿Eliminar el borrador?',
    cuerpo: `<p>Se eliminará el borrador N.° ${d.numero} de <strong>${esc(e.nombre)}</strong> (${periodo(d)}). Esta acción no se puede deshacer.</p>`,
    acciones: `${btn('Cancelar', { attrs: 'data-nxgov-modal-close="no" autofocus' })}${btn('Eliminar', { variant: 'danger', iconName: 'trash', attrs: 'data-nxgov-modal-close="si"' })}` })
    .then((v) => { if (v !== 'si') return; ui.seleccion.delete(id); store.eliminarBorrador(id); render(); notificar('success', `Se eliminó el borrador de ${e.nombre}.`); });
}

function crearGrupo() {
  const ids = [...ui.seleccion];
  const moverán = ids.filter((id) => store.declaracion(id).grupoId).length;
  modal({ variante: 'info', icono: 'layer-group', titulo: 'Crear grupo de firma',
    cuerpo: `<p>${ids.length === 1 ? 'La declaración seleccionada quedará' : `Las ${ids.length} declaraciones seleccionadas quedarán`} en un grupo nuevo para firmarlas juntas.${moverán ? ` ${moverán === 1 ? 'Una sale' : `${moverán} salen`} de su grupo actual.` : ''}</p>
      <div class="nxgov-field"><label class="nxgov-field__label" for="nombre-grupo">Nombre del grupo</label><div class="nxgov-input"><input class="nxgov-input__control" id="nombre-grupo" value="Grupo N.° ${store.getState().seq.grupo + 1}" maxlength="60"></div></div>`,
    acciones: `${btn('Cancelar', { attrs: 'data-nxgov-modal-close="no"' })}${btn('Crear grupo', { variant: 'primary', iconName: 'layer-group', attrs: 'data-nxgov-modal-close="si"' })}` })
    .then((v) => {
      if (v !== 'si') return;
      const nombre = document.getElementById('nombre-grupo')?.value.trim();
      const g = store.crearGrupo(ids, nombre || undefined);
      ui.seleccion.clear();
      location.hash = `#/grupo/${g.id}`;
    });
  // El modal se crea fuera de main; leemos el nombre antes de que se elimine (se elimina 400 ms después del cierre).
}

function agregarAGrupo(root) {
  const ids = [...ui.seleccion];
  const total = ids.reduce((a, id) => a + store.declaracion(id).liq.total, 0);
  const s = store.getState();
  const opciones = s.grupos.map((g) => {
    const est = store.estadoGrupo(g), ed = store.grupoEditable(g), n = store.declaracionesDe(g.id).length;
    return `<li class="app-opcion ${ed ? '' : 'app-opcion--off'}"><input type="radio" name="grupo-destino" id="gd-${g.id}" value="${g.id}" ${ed ? '' : 'disabled'}>
      <label for="gd-${g.id}"><span class="app-opcion__titulo">${esc(g.nombre)}</span><span class="app-opcion__detalle">${n} declaraciones · ${ed ? (est === 'listo' ? 'Firmantes definidos' : 'Sin firmantes') : est === 'en-firma' ? 'Ya está en firma' : 'Ya firmado'}</span></label>
      ${tag(ESTADOS_GRUPO[est].texto, ESTADOS_GRUPO[est].tag)}</li>`;
  }).join('');
  const el = panel({ titulo: 'Agregar a un grupo existente', subtitulo: `${ids.length} ${ids.length === 1 ? 'declaración seleccionada' : 'declaraciones seleccionadas'} · ${pesos(total)}`,
    cuerpo: `${aviso('info', 'Solo grupos que aún no se envían a firma', 'Si el grupo ya está en firma o firmado, crea un grupo nuevo con estas declaraciones.')}
      <fieldset class="app-fieldset"><legend class="app-fieldset__legend">Elige el grupo</legend><ul class="app-opciones" role="list">${opciones}</ul></fieldset>
      <p class="app-error" id="err-grupo" hidden>Elige un grupo para continuar.</p>
      <div class="app-acciones app-acciones--end">${btn('Cancelar', { attrs: 'data-nxgov-flyout-close' })}${btn('Agregar al grupo', { variant: 'primary', iconName: 'plus', attrs: 'data-confirmar' })}</div>
      <p><a href="#" data-nuevo>¿Ninguno sirve? Crea un grupo nuevo</a></p>` });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-nuevo]')) { e.preventDefault(); cerrarPanel(el); crearGrupo(); return; }
    if (!e.target.closest('[data-confirmar]')) return;
    const gid = el.querySelector('input[name="grupo-destino"]:checked')?.value;
    if (!gid) { el.querySelector('#err-grupo').hidden = false; return; }
    store.moverAGrupo(gid, ids); ui.seleccion.clear(); cerrarPanel(el);
    location.hash = `#/grupo/${gid}`;
  });
}

// ---------- Entidades ----------
function entidades() {
  return `<table class="app-table"><caption class="nxgov-sr-only">Entidades disponibles para declarar</caption>
    <thead><tr><th scope="col">Entidad</th><th scope="col">Departamento</th><th scope="col">Código DANE</th><th scope="col">Tipo</th></tr></thead>
    <tbody>${ENTIDADES.map((e) => `<tr><th scope="row">${esc(e.nombre)}</th><td>${esc(e.depto)}</td><td>${esc(e.dane)}</td><td>${esc(e.tipo)}</td></tr>`).join('')}</tbody></table>
    ${aviso('info', 'Entidades disponibles para declarar', 'Solo puedes declarar ante estas entidades: están inscritas y habilitadas en la consola administrativa. Si falta alguna, comunícate con el administrador de la plataforma.')}`;
}

// ---------- Grupos ----------
function grupos() {
  const s = store.getState();
  const filas = [...s.grupos].reverse().map((g) => {
    const ds = store.declaracionesDe(g.id), est = ESTADOS_GRUPO[store.estadoGrupo(g)];
    const firmantes = [...new Set(ds.flatMap((d) => d.firmantes.map((f) => f.nombre)))];
    return `<tr><th scope="row"><a href="#/grupo/${g.id}">${esc(g.nombre)}</a><span class="app-table__sub">${g.origen === 'carga' ? 'Creado al generar' : 'Creado a mano'} · ${fecha(g.creado)}</span></th>
      <td class="app-num">${ds.length}</td><td>${firmantes.length ? esc(firmantes.slice(0, 2).join(', ')) + (firmantes.length > 2 ? ` y ${firmantes.length - 2} más` : '') : 'Sin definir'}</td>
      <td class="app-num">${pesos(ds.reduce((a, d) => a + d.liq.total, 0))}</td><td>${tag(est.texto, est.tag)}</td>
      <td><a href="#/grupo/${g.id}">${store.estadoGrupo(g) === 'sin-firmantes' ? 'Definir firmantes' : 'Ver grupo'}<span class="nxgov-sr-only"> ${esc(g.nombre)}</span></a></td></tr>`;
  }).join('');
  return `${aviso('info', 'Firma tus declaraciones por grupos', 'Cada carga crea su grupo de firma. Para armar uno a mano, selecciona declaraciones en borrador en la pestaña Declaraciones del periodo y elige «Crear grupo de firma».')}
    <table class="app-table"><caption class="nxgov-sr-only">Grupos de firma</caption>
    <thead><tr><th scope="col">Grupo</th><th scope="col" class="app-num">Declaraciones</th><th scope="col">Firmantes</th><th scope="col" class="app-num">Total a pagar</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="6">Aún no hay grupos.</td></tr>'}</tbody></table>`;
}

export { fechaLimite };
