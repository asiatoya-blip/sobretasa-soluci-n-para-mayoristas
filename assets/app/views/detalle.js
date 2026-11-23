// Detalle de una declaración (Ver / PDF). Con ?imprimir=1 abre el diálogo de impresión del navegador (guardar como PDF).
import * as store from '../store.js';
import { EMPRESA } from '../config.js';
import { esc, pesos, num, periodo, fecha, fechaHora, ESTADOS, tag, linkBtn, btn, aviso, breadcrumb } from '../ui.js';
import { tablaCalculo } from './carga.js';

export function encabezadoDeclaracion(d) {
  const e = store.ent(d.dane);
  return `<dl class="app-datos">
    <div><dt>Contribuyente</dt><dd>${esc(EMPRESA.razonSocial)} · NIT ${esc(EMPRESA.nit)}</dd></div>
    <div><dt>Entidad</dt><dd>${esc(e.nombre)} (${esc(e.depto)}) · DANE ${esc(d.dane)}</dd></div>
    <div><dt>Periodo gravable</dt><dd>${periodo(d)}</dd></div>
    <div><dt>N.° de declaración</dt><dd>SG-${d.anio}-${String(d.numero).padStart(6, '0')}</dd></div>
    <div><dt>Fecha límite</dt><dd>${fecha(d.liq.fechaLimite)}${d.liq.extemporanea ? ' · extemporánea' : ''}</dd></div>
    <div><dt>Galones declarados</dt><dd>${num(d.liq.galones)}</dd></div>
  </dl>`;
}

export function vistaDetalle(id) {
  const d = store.declaracion(id);
  if (!d) return { titulo: 'Declaración no encontrada', html: `<h1 class="app-title" tabindex="-1">La declaración no existe</h1><p><a href="#/">Volver al tablero</a></p>` };
  const e = store.ent(d.dane), est = ESTADOS[d.estado], g = d.grupoId && store.grupo(d.grupoId);
  const imprimir = location.hash.includes('imprimir=1');
  const accion = { borrador: g ? linkBtn('Ir al grupo de firma', `#/grupo/${g.id}`, { variant: 'primary', iconName: 'signature' }) : '',
    pendiente: g ? linkBtn('Ver grupo de firma', `#/grupo/${g.id}`, { iconName: 'layer-group' }) : '',
    firmada: linkBtn('Pagar', `#/pago/${d.id}`, { variant: 'primary', iconName: 'money-bill' }),
    pagada: linkBtn('Ver comprobante', `#/pago/${d.id}/comprobante`, { iconName: 'file-alt' }) }[d.estado];
  return {
    titulo: `Declaración ${e.nombre}`,
    html: `${breadcrumb([{ label: 'Inicio', href: '#/' }, { label: 'Declaraciones masivas de sobretasa', href: '#/' }, { label: 'Declaración' }])}
      <div class="app-pagehead"><div><h1 class="app-title" tabindex="-1">Declaración de sobretasa a la gasolina · ${esc(e.nombre)}</h1>
      <p class="app-lead">${est.mensaje}</p></div>${tag(est.texto, est.tag)}</div>
      ${d.estado === 'borrador' ? aviso('info', 'Borrador', 'Esta declaración aún no tiene validez: debe firmarse y pagarse.') : ''}
      <section class="app-card" aria-labelledby="datos-t"><h2 class="app-h3" id="datos-t">Datos de la declaración</h2>${encabezadoDeclaracion(d)}</section>
      <section class="app-card" aria-labelledby="liq-t"><h2 class="app-h3" id="liq-t">Liquidación</h2>${tablaCalculo(d.liq)}
        <p class="app-nota">Valores simulados para pruebas: precios de referencia, tarifa ${num(d.liq.tarifa, 1)} %, sanción e intereses según los parámetros de la demo.</p></section>
      <section class="app-card" aria-labelledby="firm-t"><h2 class="app-h3" id="firm-t">Firmantes</h2>
        ${d.firmantes.length ? `<ul class="app-lista-simple">${d.firmantes.map((f) => `<li><strong>${esc(f.nombre)}</strong> · ${esc(f.rol)} · C.C. ${esc(f.documento)}${f.tp ? ` · T.P. ${esc(f.tp)}` : ''}${d.estado === 'firmada' || d.estado === 'pagada' ? ' · Firmó' : ''}</li>`).join('')}</ul>` : '<p>Aún no tiene firmantes.</p>'}</section>
      ${d.pago ? `<section class="app-card" aria-labelledby="pago-t"><h2 class="app-h3" id="pago-t">Pago</h2><p>${pesos(d.pago.valor)} pagados por PSE (${esc(d.pago.banco)}) el ${fechaHora(d.pago.fecha)} · Referencia ${esc(d.pago.referencia)}</p></section>` : ''}
      <div class="app-acciones app-acciones--between app-no-print">${linkBtn('Volver al tablero', '#/declaraciones', { iconName: 'arrow-left' })}
        <div class="app-acciones">${btn('Descargar PDF', { iconName: 'download', attrs: 'data-imprimir' })}${accion || ''}</div></div>`,
    bind: (root) => root.querySelector('[data-imprimir]').addEventListener('click', () => window.print()),
    after: () => { if (imprimir) setTimeout(() => window.print(), 300); },
  };
}
