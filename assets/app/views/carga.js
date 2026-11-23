// Nueva carga masiva: paso 1 «Cargar archivo» y paso 2 «Revisar y generar».
import * as store from '../store.js';
import { EMPRESA, PARAMS, PRECIOS_REFERENCIA } from '../config.js';
import { periodoVigente, periodoCorto } from '../calc.js';
import { leerXlsx } from '../xlsx.js';
import { validarArchivo, esPlantilla } from '../validate.js';
import { descargarEjemplo } from '../ejemplo.js';
import { esc, pesos, num, periodo, tag, icon, btn, linkBtn, aviso, notificar, breadcrumb, sectionHeading, stepper, helpPanel, modal } from '../ui.js';
import { ui, setFlash } from '../flash.js';

const migas = () => breadcrumb([{ label: 'Inicio', href: '#/' }, { label: 'Declaraciones masivas de sobretasa', href: '#/' }, { label: 'Nueva carga masiva' }]);
const cabecera = () => {
  const P = periodoVigente(store.hoy());
  return `${migas()}<div class="app-pagehead"><div><h1 class="app-title" tabindex="-1">Nueva carga masiva</h1>
    <p class="app-lead">${esc(EMPRESA.razonSocial)} · NIT ${EMPRESA.nit} · Periodo gravable ${periodoCorto(P).toLowerCase()}</p></div></div>`;
};

const regla = (t) => `<li class="app-regla">${icon('check', 'app-regla__icon')}<span>${t}</span></li>`;

export function vistaCarga() {
  const P = periodoVigente(store.hoy());
  return {
    titulo: 'Nueva carga masiva · Paso 1 de 2',
    html: `${cabecera()}
    <div class="app-cols"><div class="app-main">
      ${stepper(1)}
      <section class="app-card" aria-labelledby="plantilla-t">
        ${sectionHeading('plantilla-t', 'Descarga y diligencia la plantilla', 'Usa siempre la plantilla vigente. Una fila por entidad y periodo, desde la fila 3 de la hoja «Datos».', 'file-alt')}
        <ul class="app-reglas" role="list">
          ${regla(`Puedes incluir de ${PARAMS.minFilas} a ${PARAMS.maxFilas} declaraciones en cada carga.`)}
          ${regla('Identifica la entidad con su código DANE (5 dígitos para municipios, 2 para departamentos). Consulta las <a href="#/entidades">entidades disponibles</a>.')}
          ${regla(`Escribe el mes (1 a 12) y el año del periodo. El periodo vigente es ${periodoCorto(P).toLowerCase()}.`)}
          ${regla('Si una declaración es extemporánea, se liquida con la sanción que defina cada entidad según sus parámetros.')}
          ${regla('Gasolina oxigenada: escribe los galones y el % de alcohol carburante (hasta 3 mezclas por producto). El alcohol no es gravado.')}
          ${regla('Los datos de tu empresa, tarifas y sanciones ya están precargados: <strong>no los escribas en el archivo</strong>.')}
        </ul>
        <div class="app-acciones">
          <a class="nxgov-button nxgov-button--outline" href="plantillas/Plantilla_Declaraciones_Sobretasa.xlsx" download>${icon('download')}<span class="nxgov-button__label">Descargar plantilla (.xlsx)</span></a>
          <button type="button" class="app-link" data-ejemplo>Ver un ejemplo diligenciado</button>
        </div>
      </section>
      ${aviso('warning', 'Solo puedes declarar ante entidades habilitadas', 'Si el archivo incluye una entidad que no está habilitada en la plataforma, esa fila no se generará.', '<p class="nxgov-alert__message"><a class="nxgov-alert__link" href="#/entidades">Ver entidades disponibles</a></p>')}
      <section class="app-card" aria-labelledby="carga-t">
        ${sectionHeading('carga-t', 'Carga el archivo diligenciado', 'Formato .xlsx, máximo 5 MB. Puedes arrastrarlo o seleccionarlo con el teclado.', 'upload')}
        <div class="nxgov-file-upload" data-nxgov-component="file-upload" id="archivo" data-nxgov-accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-nxgov-max-size="5242880">
          <label class="nxgov-file-upload__label" for="archivo-input">Archivo de declaraciones (.xlsx)<span aria-hidden="true">*</span></label>
          <div class="nxgov-file-upload__dropzone">${icon('cloud-upload', 'nxgov-file-upload__icon')}
            <p class="nxgov-file-upload__instruction">Arrastra aquí tu archivo de declaraciones o</p>
            <input class="nxgov-file-upload__input" type="file" id="archivo-input" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required aria-describedby="archivo-hint archivo-error">
            <label class="nxgov-button nxgov-button--outline nxgov-file-upload__trigger" for="archivo-input" aria-hidden="true">${icon('upload')}<span class="nxgov-button__label">Seleccionar archivo</span></label></div>
          <div class="nxgov-file-upload__file" hidden>${icon('file-alt', 'nxgov-file-upload__file-icon')}<div class="nxgov-file-upload__file-info"><span class="nxgov-file-upload__name"></span><span class="nxgov-file-upload__meta"></span></div>
            <button type="button" class="nxgov-button nxgov-button--outline nxgov-file-upload__remove">${icon('trash')}<span class="nxgov-button__label">Quitar<span class="nxgov-sr-only"> archivo cargado</span></span></button></div>
          <p class="nxgov-file-upload__hint" id="archivo-hint">Solo archivos .xlsx (Excel). Tamaño máximo 5 MB.</p>
          <p class="nxgov-file-upload__error" id="archivo-error" hidden>${icon('error', 'nxgov-file-upload__error-icon')}<span class="nxgov-file-upload__error-text"></span></p>
        </div>
      </section>
      ${aviso('info', 'Revisaremos tu archivo antes de crear las declaraciones', 'Validamos formato, códigos DANE, periodo, duplicados y valores. No se crea ninguna declaración hasta que confirmes en el siguiente paso.')}
      <div class="app-acciones app-acciones--between">${linkBtn('Volver al tablero', '#/', { iconName: 'arrow-left' })}${btn('Revisar archivo', { variant: 'primary', iconName: 'arrow-right', iconAfter: true, attrs: 'data-revisar' })}</div>
    </div>
    <aside class="app-side">${helpPanel('Conoce cómo hacer tu carga masiva').replace('nxgov-help--horizontal', '')}</aside></div>`,
    bind: (root) => {
      root.querySelector('[data-ejemplo]').addEventListener('click', () => { descargarEjemplo(store.hoy()); notificar('info', 'Se descargó un archivo de ejemplo con el periodo vigente. Cárgalo en el recuadro para probar la revisión.'); });
      root.querySelector('[data-revisar]').addEventListener('click', (e) => revisar(root, e.currentTarget));
    },
  };
}

async function revisar(root, boton) {
  const fu = root.querySelector('#archivo');
  const file = window.nxgov.fileUpload.file(fu);
  const errorEl = fu.querySelector('.nxgov-file-upload__error');
  const mostrarError = (msg) => { fu.querySelector('.nxgov-file-upload__error-text').textContent = msg; errorEl.hidden = false; fu.querySelector('input').setAttribute('aria-invalid', 'true'); fu.querySelector('input').focus(); window.nxgov.announce?.(msg, 'assertive'); };
  if (!file) { mostrarError('Selecciona el archivo de declaraciones para continuar.'); return; }
  window.nxgov.setBusy?.(boton, true, 'Revisando el archivo');
  try {
    const { filas } = await leerXlsx(await file.arrayBuffer());
    if (!esPlantilla(filas)) throw new Error('NO_PLANTILLA');
    const datos = Object.entries(filas).filter(([n]) => Number(n) >= 3).map(([n, celdas]) => ({ fila: Number(n), celdas })).sort((a, b) => a.fila - b.fila);
    const hoy = store.hoy();
    const resultado = validarArchivo(datos, { declaraciones: store.getState().declaraciones, hoy, periodo: periodoVigente(hoy) });
    ui.revision = { archivo: file.name, resultado };
    location.hash = '#/carga/revision';
  } catch (err) {
    const msg = { XLS_ANTIGUO: 'El archivo está en formato .xls antiguo. Ábrelo en Excel y guárdalo como .xlsx.', NO_PLANTILLA: 'El archivo no tiene el formato de la plantilla: la celda A1 debe decir «Código DANE». Descarga la plantilla y vuelve a intentarlo.' }[err.message]
      || 'No pudimos leer el archivo. Verifica que sea la plantilla en formato .xlsx.';
    mostrarError(msg);
  } finally { window.nxgov.setBusy?.(boton, false); }
}

// ---------- Paso 2 ----------
export function vistaRevision() {
  if (!ui.revision) return { redirect: '#/carga' };
  const { archivo, resultado } = ui.revision;
  const filas = resultado.filas;
  const conError = filas.filter((f) => f.errores.length), validas = filas.filter((f) => !f.errores.length);
  const conAdv = validas.filter((f) => f.advertencias.length), extemp = validas.filter((f) => f.liquidacion.extemporanea);
  const total = validas.reduce((a, f) => a + f.liquidacion.total, 0);
  const bloqueo = resultado.errorArchivo.length > 0 || validas.length === 0;
  const kpi = (et, val, apoyo) => `<div class="app-kpi"><p class="app-kpi__label">${et}</p><p class="app-kpi__value">${val}</p><p class="app-kpi__help">${apoyo}</p></div>`;
  const obs = [];
  for (const f of filas) {
    const nombre = f.entidad ? f.entidad.nombre : 'Entidad no habilitada';
    f.errores.forEach((o) => obs.push({ f, tipo: 'Error', tagT: 'error', nombre, o }));
    f.advertencias.forEach((o) => obs.push({ f, tipo: 'Advertencia', tagT: 'pending', nombre, o }));
  }
  const tablaObs = obs.length ? `<h2 class="app-h2">Filas con observaciones (${obs.length})</h2>
    <ul class="app-mlista app-solo-movil" role="list" aria-label="Filas con observaciones">${obs.map(({ f, tipo, tagT, nombre, o }) => `<li class="app-mitem"><span class="app-mitem__titulo">Fila ${f.fila}</span>${tag(tipo, tagT)}
      <p><strong>${esc(nombre)}</strong></p><p class="app-mitem__sub">Columna: ${esc(o.columna)}</p><p>${esc(o.problema)}</p><p class="app-mitem__nota">${esc(o.solucion)}</p></li>`).join('')}</ul>
    <table class="app-table app-solo-desk"><caption class="nxgov-sr-only">Observaciones de la revisión del archivo</caption>
    <thead><tr><th scope="col">Fila</th><th scope="col">Tipo</th><th scope="col">Entidad</th><th scope="col">Columna</th><th scope="col">Qué pasa</th><th scope="col">Cómo corregirlo</th></tr></thead>
    <tbody>${obs.map(({ f, tipo, tagT, nombre, o }) => `<tr><td data-label="Fila">${f.fila}</td><td data-label="Tipo">${tag(tipo, tagT)}</td><td data-label="Entidad"><strong>${esc(nombre)}</strong><span class="app-table__sub">DANE ${esc(f.dane || '—')}</span></td><td data-label="Columna">${esc(o.columna)}</td><td data-label="Qué pasa">${esc(o.problema)}</td><td data-label="Cómo corregirlo">${esc(o.solucion)}</td></tr>`).join('')}</tbody></table>` : '';
  const tablaVal = validas.length ? `<h2 class="app-h2">Declaraciones que se generarán (${validas.length})</h2>
    <ul class="app-mlista app-solo-movil" role="list" aria-label="Declaraciones que se generarán" id="previa-movil">${validas.map((f, i) => `<li class="app-mitem" ${i >= 3 ? 'hidden' : ''}><span class="app-mitem__titulo">${esc(f.entidad.nombre)}</span>${f.liquidacion.extemporanea ? tag('Extemporánea', 'pending') : tag('Lista', 'signed')}
      <p class="app-mitem__sub">${num(f.liquidacion.galones)} gal · ${pesos(f.liquidacion.total)}</p></li>`).join('')}</ul>
    ${validas.length > 3 ? `<button type="button" class="app-link app-solo-movil" data-ver-todas aria-controls="previa-movil" aria-expanded="false">Ver las ${validas.length} declaraciones</button>` : ''}
    <table class="app-table app-solo-desk"><caption class="nxgov-sr-only">Vista previa de las declaraciones</caption>
    <thead><tr><th scope="col">Entidad</th><th scope="col">Periodo</th><th scope="col" class="app-num">Galones</th><th scope="col" class="app-num">Impuesto</th><th scope="col" class="app-num">Sanción</th><th scope="col" class="app-num">Total</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
    <tbody>${validas.map((f, i) => `<tr><th scope="row" data-label="Entidad">${esc(f.entidad.nombre)}<span class="app-table__sub">${esc(f.entidad.depto)} · DANE ${esc(f.dane)}</span></th>
      <td data-label="Periodo">${periodo(f.periodo)}</td><td data-label="Galones" class="app-num">${num(f.liquidacion.galones)}</td><td data-label="Impuesto" class="app-num">${pesos(f.liquidacion.impuesto)}</td>
      <td data-label="Sanción" class="app-num">${f.liquidacion.sancion ? pesos(f.liquidacion.sancion + f.liquidacion.intereses) : '—'}</td><td data-label="Total" class="app-num"><strong>${pesos(f.liquidacion.total)}</strong></td>
      <td data-label="Estado">${f.liquidacion.extemporanea ? tag('Extemporánea', 'pending') : tag('Lista para generar', 'signed')}</td>
      <td data-label="Acción"><button type="button" class="app-link" data-calculo="${i}">Ver cálculo<span class="nxgov-sr-only"> de ${esc(f.entidad.nombre)}</span></button></td></tr>`).join('')}</tbody></table>
    <p class="app-total">Total estimado de la carga <strong>${pesos(total)}</strong></p>` : '';
  return {
    titulo: 'Nueva carga masiva · Paso 2 de 2',
    html: `${cabecera()}
      ${stepper(2)}
      ${sectionHeading('revision-t', 'Revisa el resultado de tu archivo', `${archivo} · Aún no se ha creado ninguna declaración.`, 'check-double')}
      <div class="app-kpis app-kpis--2x2">${kpi('Filas leídas', filas.length, `De ${PARAMS.maxFilas} permitidas`)}${kpi('Listas para generar', validas.length, `${validas.length - conAdv.length} sin observaciones · ${conAdv.length} con advertencia`)}${kpi('Con errores', conError.length, 'No se generarán')}${kpi('Con advertencias', conAdv.length, 'Se generan; revísalas')}</div>
      ${resultado.errorArchivo.map((m) => aviso('danger', 'No podemos generar esta carga', esc(m))).join('')}
      ${conError.length && !resultado.errorArchivo.length ? aviso('danger', `${conError.length} ${conError.length === 1 ? 'fila tiene errores y no se generará' : 'filas tienen errores y no se generarán'}`, `Corrige tu archivo y vuelve a cargarlo, o continúa solo con las ${validas.length} declaraciones listas. Las filas con error no se guardan.`) : ''}
      ${extemp.length ? aviso('warning', `${extemp.length} ${extemp.length === 1 ? 'declaración es extemporánea' : 'declaraciones son extemporáneas'}`, 'Están fuera del plazo de su entidad. Se generan con la sanción por extemporaneidad y los intereses de mora que define cada entidad (valores simulados).') : ''}
      ${tablaObs}${tablaVal}
      ${aviso('info', 'Calculado con la normativa de cada entidad', `Tarifa de la entidad sobre el precio de referencia por galón (corriente ${pesos(PRECIOS_REFERENCIA.corriente.valor)}, extra ${pesos(PRECIOS_REFERENCIA.extra.valor)}); el alcohol carburante no es gravado. <strong>Valores simulados para pruebas.</strong>`)}
      <div class="app-acciones app-acciones--between">${btn('Volver al paso anterior', { iconName: 'arrow-left', attrs: 'data-volver' })}${btn(`Generar ${validas.length} ${validas.length === 1 ? 'declaración' : 'declaraciones'}`, { variant: 'primary', iconName: 'arrow-right', iconAfter: true, attrs: `data-generar ${bloqueo ? 'disabled' : ''}` })}</div>`,
    bind: (root) => {
      root.querySelector('[data-volver]').addEventListener('click', () => { ui.revision = null; location.hash = '#/carga'; });
      root.querySelector('[data-generar]').addEventListener('click', () => {
        if (bloqueo) return;
        const { grupo, ids } = store.generar(archivo, filas);
        ui.revision = null;
        ui.seleccion = new Set(ids);
        const P = validas[0].periodo; ui.filtros = { anio: String(P.anio), mes: String(P.mes), estado: '', q: '' }; ui.pagina = 1;
        setFlash({ variant: 'success', title: `Se generaron ${ids.length} declaraciones en borrador`, message: `Quedaron en el grupo de firma «${grupo.nombre}» y seleccionadas abajo. Define quién las firma desde «Firmar» o en la pestaña Grupos de firma.` });
        location.hash = '#/declaraciones';
      });
      root.addEventListener('click', (e) => { const b = e.target.closest('[data-calculo]'); if (b) verCalculo(validas[Number(b.dataset.calculo)]); });
      root.querySelector('[data-ver-todas]')?.addEventListener('click', (e) => {
        root.querySelectorAll('#previa-movil > [hidden]').forEach((li) => { li.hidden = false; });
        e.currentTarget.remove();
      });
    },
  };
}

export function tablaCalculo(liq) {
  return `<table class="app-table app-table--compact"><caption class="nxgov-sr-only">Liquidación por producto</caption>
    <thead><tr><th scope="col">Producto</th><th scope="col" class="app-num">Galones</th><th scope="col" class="app-num">Gravados</th><th scope="col" class="app-num">Precio ref.</th><th scope="col" class="app-num">Impuesto</th></tr></thead>
    <tbody>${liq.productos.map((p) => `<tr><th scope="row">${esc(p.nombre)}${p.mezclas.some((m) => m.alcohol) ? `<span class="app-table__sub">Alcohol: ${p.mezclas.map((m) => `${num(m.alcohol, 1)} %`).join(', ')}</span>` : ''}</th><td class="app-num">${num(p.galones)}</td><td class="app-num">${num(p.galonesGravados, 1)}</td><td class="app-num">${pesos(p.precioReferencia)}</td><td class="app-num">${pesos(p.impuesto)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><th scope="row" colspan="4">Impuesto (tarifa ${num(liq.tarifa, 1)} %, redondeado)</th><td class="app-num">${pesos(liq.impuesto)}</td></tr>
    <tr><th scope="row" colspan="4">Sanción por extemporaneidad${liq.extemporanea ? ` (${liq.mesesRetardo} ${liq.mesesRetardo === 1 ? 'mes' : 'meses'} de retardo)` : ''}</th><td class="app-num">${pesos(liq.sancion)}</td></tr>
    <tr><th scope="row" colspan="4">Intereses de mora</th><td class="app-num">${pesos(liq.intereses)}</td></tr>
    <tr class="app-table__total"><th scope="row" colspan="4">Total a pagar</th><td class="app-num">${pesos(liq.total)}</td></tr></tfoot></table>`;
}

function verCalculo(f) {
  modal({ variante: 'info', icono: 'money-bill', titulo: `Cálculo · ${f.entidad.nombre}`,
    cuerpo: `<p>${periodo(f.periodo)} · Fecha límite ${new Date(f.liquidacion.fechaLimite).toLocaleDateString('es-CO')}</p>${tablaCalculo(f.liquidacion)}<p class="app-nota">Valores simulados para pruebas.</p>`,
    acciones: btn('Cerrar', { variant: 'primary', attrs: 'data-nxgov-modal-close="ok" autofocus' }) });
}
