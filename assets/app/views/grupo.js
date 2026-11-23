// Grupo de firma (patrón de la célula sogas): declaraciones del grupo a la izquierda, firmantes de la seleccionada a la derecha.
import * as store from '../store.js';
import { ROLES_FIRMANTE } from '../config.js';
import { esc, pesos, periodo, fecha, ESTADOS, ESTADOS_GRUPO, tag, icon, btn, linkBtn, aviso, notificar, breadcrumb, sectionHeading, modal, panel, cerrarPanel } from '../ui.js';
import { ui } from '../flash.js';
import { render } from '../main.js';

const correoOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const vacio = () => ({ rol: 'Declarante principal', nombre: '', documento: '', tp: '', correo: '' });

export function vistaGrupo(gid) {
  const g = store.grupo(gid);
  if (!g) return { titulo: 'Grupo no encontrado', html: `${breadcrumb([{ label: 'Inicio', href: '#/' }, { label: 'Grupo de firma' }])}<h1 class="app-title" tabindex="-1">El grupo ya no existe</h1><p>Puede que se haya quedado sin declaraciones. <a href="#/grupos">Ver grupos de firma</a></p>` };
  const ds = store.declaracionesDe(gid);
  const est = store.estadoGrupo(g), editable = store.grupoEditable(g);
  if (!ds.some((d) => d.id === ui.grupoSeleccion[gid])) ui.grupoSeleccion[gid] = ds[0]?.id;
  const actual = store.declaracion(ui.grupoSeleccion[gid]);
  const total = ds.reduce((a, d) => a + d.liq.total, 0);

  const estadoAviso = {
    'en-firma': aviso('info', 'El grupo está en firma', `Enviamos el enlace de firma a los firmantes el ${fecha(g.enviadoEl || g.creado)}. Cuando todos firmen, las declaraciones pasarán a «Firmada» y podrás pagarlas una por una.`,
      `<div class="app-demo">${icon('info', 'app-demo__icon')}<p><strong>Demostración:</strong> la firma la hace un servicio externo. Simula que los firmantes ya firmaron.</p>${btn('Simular firma de los firmantes', { variant: 'primary', iconName: 'signature', attrs: 'data-simular' })}</div>`),
    firmado: aviso('success', 'Grupo firmado', 'Todas las declaraciones están firmadas. Págalas una por una desde el tablero antes de la fecha límite de cada entidad.', `<p class="nxgov-alert__message"><a class="nxgov-alert__link" href="#/declaraciones">Ir al tablero para pagar</a></p>`),
  }[est] || '';

  const items = ds.map((d) => {
    const e = store.ent(d.dane), ok = store.firmantesCompletos(d), sel = d.id === actual?.id;
    return `<li class="app-item ${sel ? 'app-item--sel' : ''}"><button type="button" class="app-item__main" data-ver="${d.id}" ${sel ? 'aria-current="true"' : ''}>
      <span class="app-item__titulo">${esc(e.nombre)}</span><span class="app-item__detalle">DANE ${esc(d.dane)} · ${periodo(d)} · ${d.firmantes.length} ${d.firmantes.length === 1 ? 'firmante' : 'firmantes'}</span></button>
      ${d.estado === 'borrador' ? tag(ok ? 'Firmantes completos' : 'Faltan firmantes', ok ? 'completed' : 'pending') : tag(ESTADOS[d.estado].texto, ESTADOS[d.estado].tag)}
      ${editable ? `<button type="button" class="app-link app-item__quitar" data-quitar="${d.id}">Quitar del grupo<span class="nxgov-sr-only"> ${esc(e.nombre)}</span></button>` : ''}</li>`;
  }).join('');

  const firmantesGrupo = new Map();
  ds.forEach((d) => d.firmantes.forEach((f) => { const k = `${f.documento}|${f.rol}`; const x = firmantesGrupo.get(k) || { ...f, n: 0 }; x.n += 1; firmantesGrupo.set(k, x); }));

  return {
    titulo: `Grupo de firma · ${g.nombre}`,
    html: `${breadcrumb([{ label: 'Inicio', href: '#/' }, { label: 'Declaraciones masivas de sobretasa', href: '#/' }, { label: 'Grupo de firma' }])}
      <div class="app-pagehead"><div><h1 class="app-title" tabindex="-1">Grupo de firma: ${esc(g.nombre)}</h1>
      <p class="app-lead">${ds.length} ${ds.length === 1 ? 'declaración' : 'declaraciones'} · Total ${pesos(total)} · ${g.origen === 'carga' ? 'Creado al generar' : 'Creado a mano'} el ${fecha(g.creado)}</p></div>
      ${tag(ESTADOS_GRUPO[est].texto, ESTADOS_GRUPO[est].tag)}</div>
      ${estadoAviso}
      ${sectionHeading('firmantes-t', 'Define quién firma las declaraciones del grupo', editable ? 'Agrega los firmantes y guarda: así queda guardado el grupo. Si una declaración no va en este grupo, quítala.' : 'El grupo ya se envió a firma: los firmantes no se pueden cambiar.', 'signature')}
      <div class="app-grupo">
        <section class="app-card app-grupo__lista" aria-labelledby="lista-t">
          <h2 class="app-h3" id="lista-t">Declaraciones del grupo (${ds.length})</h2>
          ${editable ? btn('Agregar declaraciones', { iconName: 'plus', attrs: 'data-agregar' }) : ''}
          <ul class="app-items" role="list">${items}</ul>
        </section>
        <section class="app-card app-grupo__firmantes" aria-labelledby="decl-t">
          ${actual ? formFirmantes(actual, editable, ds.length) : '<p>Selecciona una declaración.</p>'}
        </section>
      </div>
      ${aviso('info', 'Firma electrónica con plena validez legal', 'Cada firmante recibe un correo para firmar todas sus declaraciones a la vez (Ley 527 de 1999).')}
      <h2 class="app-h2">Firmantes del grupo</h2>
      <table class="app-table app-table--stack"><caption class="nxgov-sr-only">Firmantes del grupo</caption>
        <thead><tr><th scope="col">Firmante</th><th scope="col">Rol</th><th scope="col">Documento</th><th scope="col">Tarjeta prof.</th><th scope="col">Correo</th><th scope="col" class="app-num">Declaraciones</th><th scope="col">Estado</th></tr></thead>
        <tbody>${[...firmantesGrupo.values()].map((f) => `<tr><th scope="row" data-label="Firmante">${esc(f.nombre)}</th><td data-label="Rol">${esc(f.rol)}</td><td data-label="Documento">${esc(f.documento)}</td><td data-label="Tarjeta prof.">${esc(f.tp || '—')}</td><td data-label="Correo">${esc(f.correo)}</td><td data-label="Declaraciones" class="app-num">${f.n}</td><td data-label="Estado">${est === 'firmado' ? tag('Firmó', 'completed') : est === 'en-firma' ? tag('Correo enviado', 'pending') : tag('Sin enviar', 'neutral')}</td></tr>`).join('') || '<tr><td colspan="7">Aún no hay firmantes.</td></tr>'}</tbody></table>
      <div class="app-acciones app-acciones--between">${linkBtn('Volver al tablero', '#/declaraciones', { iconName: 'arrow-left' })}
        ${editable ? `<div class="app-acciones">${btn('Guardar firmantes', { iconName: 'save', attrs: 'data-guardar' })}${btn('Firmar declaraciones', { variant: 'primary', iconName: 'signature', attrs: 'data-enviar' })}</div>` : ''}</div>`,
    bind: (root) => bindGrupo(root, g),
  };
}

function formFirmantes(d, editable, nGrupo) {
  const e = store.ent(d.dane);
  const lista = d.firmantes.length ? d.firmantes : (editable ? [vacio()] : []);
  return `<div class="app-firm-head"><div><h2 class="app-h3" id="decl-t">${esc(e.nombre)}</h2><p class="app-muted">${esc(e.depto)} · DANE ${esc(d.dane)} · ${periodo(d)} · ${pesos(d.liq.total)}</p>
    <p class="app-muted">${e.exigeRevisor ? 'Esta entidad exige declarante principal y revisor fiscal o contador.' : 'Esta entidad exige el declarante principal.'}</p></div>
    ${editable ? `<div class="app-acciones">${btn('Copiar a todo el grupo', { iconName: 'copy', attrs: `data-copiar ${nGrupo < 2 ? 'disabled' : ''}` })}${btn('Agregar firmante', { iconName: 'plus', attrs: 'data-mas' })}</div>` : ''}</div>
    <form id="form-firmantes" novalidate data-decl="${d.id}">${lista.map((f, i) => fieldsetFirmante(f, i, editable)).join('')}</form>`;
}

function fieldsetFirmante(f, i, editable) {
  const dis = editable ? '' : 'disabled';
  const campo = (name, label, val, attrs = '', ayuda = '') => `<div class="nxgov-field"><label class="nxgov-field__label" for="${name}-${i}">${label}</label>${ayuda ? `<p class="nxgov-field__hint" id="${name}-${i}-hint">${ayuda}</p>` : ''}
    <div class="nxgov-input"><input class="nxgov-input__control" id="${name}-${i}" name="${name}" value="${esc(val)}" ${attrs} ${ayuda ? `aria-describedby="${name}-${i}-hint"` : ''} ${dis}></div></div>`;
  return `<fieldset class="app-firmante" data-i="${i}"><legend class="app-firmante__legend">Firmante ${i + 1}</legend>
    ${editable ? btn('Quitar', { iconName: 'trash', sr: `firmante ${i + 1}`, attrs: `data-quitar-firmante="${i}"` }) : ''}
    <div class="app-grid2">
      <div class="nxgov-field"><label class="nxgov-field__label" for="rol-${i}">Rol<span class="nxgov-field__required" aria-hidden="true">*</span></label><div class="nxgov-select"><select class="nxgov-select__control" id="rol-${i}" name="rol" ${dis}>${ROLES_FIRMANTE.map((r) => `<option ${r === f.rol ? 'selected' : ''}>${r}</option>`).join('')}</select>${icon('chevron-down', 'nxgov-select__icon')}</div></div>
      ${campo('nombre', 'Nombre y apellidos<span class="nxgov-field__required" aria-hidden="true">*</span>', f.nombre, 'autocomplete="name" required')}
      ${campo('documento', 'Número de documento<span class="nxgov-field__required" aria-hidden="true">*</span>', f.documento, 'inputmode="numeric" required')}
      ${campo('tp', 'Tarjeta profesional', f.tp, '', 'Obligatoria para revisor fiscal o contador.')}
      ${campo('correo', 'Correo electrónico<span class="nxgov-field__required" aria-hidden="true">*</span>', f.correo, 'type="email" autocomplete="email" required')}
    </div></fieldset>`;
}

function leerForm(root) {
  return [...root.querySelectorAll('#form-firmantes fieldset')].map((fs) => ({
    rol: fs.querySelector('[name=rol]').value, nombre: fs.querySelector('[name=nombre]').value.trim(), documento: fs.querySelector('[name=documento]').value.trim(),
    tp: fs.querySelector('[name=tp]').value.trim(), correo: fs.querySelector('[name=correo]').value.trim(),
  }));
}

/** Marca errores en línea (aria-invalid + mensaje). Devuelve el primer campo con error o null. */
function validar(root) {
  root.querySelectorAll('.nxgov-field__error').forEach((p) => p.remove());
  root.querySelectorAll('[aria-invalid]').forEach((i) => { i.removeAttribute('aria-invalid'); const h = i.id + '-hint'; i.setAttribute('aria-describedby', document.getElementById(h) ? h : ''); });
  let primero = null;
  const marcar = (input, msg) => {
    input.setAttribute('aria-invalid', 'true');
    const p = document.createElement('p'); p.className = 'nxgov-field__error'; p.id = `${input.id}-error`; p.textContent = msg;
    input.closest('.nxgov-field').appendChild(p);
    input.setAttribute('aria-describedby', `${input.getAttribute('aria-describedby') || ''} ${p.id}`.trim());
    primero ||= input;
  };
  root.querySelectorAll('#form-firmantes fieldset').forEach((fs) => {
    const q = (n) => fs.querySelector(`[name=${n}]`);
    if (!q('nombre').value.trim()) marcar(q('nombre'), 'Escribe el nombre del firmante.');
    if (!/^[\d.]{5,15}$/.test(q('documento').value.trim())) marcar(q('documento'), 'Escribe el número de documento (solo números).');
    if (q('rol').value !== 'Declarante principal' && !q('tp').value.trim()) marcar(q('tp'), 'La tarjeta profesional es obligatoria para este rol.');
    if (!correoOk(q('correo').value.trim())) marcar(q('correo'), 'Escribe un correo válido, por ejemplo nombre@empresa.com.co.');
  });
  return primero;
}

function bindGrupo(root, g) {
  const declId = () => root.querySelector('#form-firmantes')?.dataset.decl;
  const guardar = (silencioso = false) => {
    if (!root.querySelector('#form-firmantes')) return true;
    const err = validar(root);
    if (err) { err.focus(); window.nxgov.announce?.('Revisa los campos marcados de los firmantes.', 'assertive'); return false; }
    store.guardarFirmantes(declId(), leerForm(root));
    if (!silencioso) { render(); notificar('success', 'Firmantes guardados. El grupo quedó guardado.'); }
    return true;
  };
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.ver) { if (!guardarBorradorSilencioso()) return; ui.grupoSeleccion[g.id] = t.dataset.ver; render(); return; }
    if (t.dataset.quitar) { quitar(g, t.dataset.quitar); return; }
    if ('agregar' in t.dataset) { agregar(g); return; }
    if ('mas' in t.dataset) { const fs = leerForm(root); fs.push({ ...{ rol: 'Revisor fiscal', nombre: '', documento: '', tp: '', correo: '' } }); store.guardarFirmantes(declId(), fs); render(); document.querySelector('#form-firmantes fieldset:last-of-type input')?.focus(); return; }
    if (t.dataset.quitarFirmante !== undefined) { const fs = leerForm(root); fs.splice(Number(t.dataset.quitarFirmante), 1); store.guardarFirmantes(declId(), fs); render(); return; }
    if ('copiar' in t.dataset) { if (validar(root)) return; const fs = leerForm(root); store.copiarFirmantesAGrupo(g.id, fs); render(); notificar('success', `Firmantes copiados a las ${store.declaracionesDe(g.id).length} declaraciones del grupo.`); return; }
    if ('guardar' in t.dataset) { guardar(); return; }
    if ('enviar' in t.dataset) { enviar(g, guardar); return; }
    if ('simular' in t.dataset) { store.simularFirma(g.id); render(); notificar('success', 'Los firmantes firmaron. Las declaraciones están listas para pagar desde el tablero.', 'Declaraciones firmadas'); }
  });
  // Al cambiar de declaración se guarda lo escrito si es válido; si está incompleto se conserva sin validar.
  function guardarBorradorSilencioso() { if (!root.querySelector('#form-firmantes')) return true; store.guardarFirmantes(declId(), leerForm(root)); return true; }
}

function quitar(g, id) {
  const d = store.declaracion(id), e = store.ent(d.dane);
  modal({ variante: 'warning', icono: 'warning', titulo: '¿Quitar la declaración del grupo?',
    cuerpo: `<p><strong>${esc(e.nombre)}</strong> (${periodo(d)}) saldrá de «${esc(g.nombre)}». Seguirá en el tablero como borrador y podrás agregarla a otro grupo.</p>`,
    acciones: `${btn('Cancelar', { attrs: 'data-nxgov-modal-close="no" autofocus' })}${btn('Quitar del grupo', { variant: 'danger', attrs: 'data-nxgov-modal-close="si"' })}` })
    .then((v) => {
      if (v !== 'si') return;
      store.quitarDeGrupo(id);
      if (!store.grupo(g.id)) { location.hash = '#/grupos'; return; }
      render(); notificar('info', `${e.nombre} salió del grupo.`);
    });
}

function agregar(g) {
  const candidatas = store.getState().declaraciones.filter((d) => d.estado === 'borrador' && d.grupoId !== g.id && (!d.grupoId || store.grupoEditable(store.grupo(d.grupoId))));
  const el = panel({ titulo: 'Agregar declaraciones al grupo', subtitulo: `${g.nombre} · ${store.declaracionesDe(g.id).length === 1 ? '1 declaración' : `${store.declaracionesDe(g.id).length} declaraciones`}`,
    cuerpo: `${aviso('info', 'Solo borradores que no estén en firma', 'Una declaración está en un solo grupo: si está en otro grupo sin enviar, se moverá a este.')}
      ${candidatas.length ? `<fieldset class="app-fieldset"><legend class="app-fieldset__legend">Borradores disponibles (${candidatas.length})</legend><ul class="app-opciones" role="list">
        ${candidatas.map((d) => { const e = store.ent(d.dane), og = d.grupoId ? store.grupo(d.grupoId).nombre : 'Sin grupo'; return `<li class="app-opcion"><input type="checkbox" id="ad-${d.id}" value="${d.id}"><label for="ad-${d.id}"><span class="app-opcion__titulo">${esc(e.nombre)}</span><span class="app-opcion__detalle">DANE ${esc(d.dane)} · ${periodo(d)} · ${pesos(d.liq.total)} · ${esc(og)}</span></label></li>`; }).join('')}
      </ul></fieldset>
      <p class="app-error" id="err-ad" hidden>Selecciona al menos una declaración.</p>
      <div class="app-acciones app-acciones--end">${btn('Cancelar', { attrs: 'data-nxgov-flyout-close' })}${btn('Agregar al grupo', { variant: 'primary', iconName: 'plus', attrs: 'data-confirmar' })}</div>`
      : `<p>No hay borradores disponibles para agregar. Haz una <a href="#/carga">nueva carga masiva</a> o quita declaraciones de otro grupo sin enviar.</p>`}` });
  el.addEventListener('click', (e) => {
    if (!e.target.closest('[data-confirmar]')) return;
    const ids = [...el.querySelectorAll('input[type=checkbox]:checked')].map((i) => i.value);
    if (!ids.length) { el.querySelector('#err-ad').hidden = false; return; }
    store.moverAGrupo(g.id, ids); cerrarPanel(el); render();
    notificar('success', `${ids.length} ${ids.length === 1 ? 'declaración agregada' : 'declaraciones agregadas'} al grupo.`);
  });
}

function enviar(g, guardar) {
  if (!guardar(true)) return;
  const ds = store.declaracionesDe(g.id);
  const faltan = ds.filter((d) => !store.firmantesCompletos(d));
  if (faltan.length) {
    ui.grupoSeleccion[g.id] = faltan[0].id; render();
    notificar('danger', `Faltan firmantes en ${faltan.length} ${faltan.length === 1 ? 'declaración' : 'declaraciones'}: ${faltan.slice(0, 3).map((d) => store.ent(d.dane).nombre).join(', ')}${faltan.length > 3 ? '…' : ''}. Cada una necesita el declarante principal${faltan.some((d) => store.ent(d.dane).exigeRevisor) ? ' y, si la entidad lo exige, revisor fiscal o contador' : ''}.`, 'No podemos enviar a firma');
    return;
  }
  const correos = new Set(ds.flatMap((d) => d.firmantes.map((f) => f.correo)));
  modal({ variante: 'info', icono: 'signature', titulo: '¿Enviar el grupo a firma?',
    cuerpo: `<p>Enviaremos un correo a <strong>${correos.size} ${correos.size === 1 ? 'firmante' : 'firmantes'}</strong> para firmar las ${ds.length} declaraciones del grupo. Después del envío ya no podrás cambiar el grupo ni los firmantes.</p>`,
    acciones: `${btn('Cancelar', { attrs: 'data-nxgov-modal-close="no" autofocus' })}${btn('Enviar a firma', { variant: 'primary', iconName: 'signature', attrs: 'data-nxgov-modal-close="si"' })}` })
    .then((v) => { if (v !== 'si') return; store.enviarAFirma(g.id); render(); notificar('success', `Enviamos el enlace de firma a ${correos.size} ${correos.size === 1 ? 'firmante' : 'firmantes'}.`, 'Grupo enviado a firma'); });
}
