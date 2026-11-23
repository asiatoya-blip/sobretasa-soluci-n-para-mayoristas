// Pago individual por PSE (simulado): resumen → pasarela de demostración → comprobante.
import * as store from '../store.js';
import { BANCOS_PSE, EMPRESA } from '../config.js';
import { esc, pesos, periodo, fecha, fechaHora, icon, btn, linkBtn, aviso, breadcrumb } from '../ui.js';
import { setFlash, takeFlash } from '../flash.js';
import { encabezadoDeclaracion } from './detalle.js';

const noExiste = { titulo: 'Declaración no encontrada', html: '<h1 class="app-title" tabindex="-1">La declaración no existe</h1><p><a href="#/">Volver al tablero</a></p>' };
let datosPago = {}; // id → { banco, persona, correo } mientras se va a la pasarela

export function vistaPago(id) {
  const d = store.declaracion(id);
  if (!d) return noExiste;
  if (d.estado === 'pagada') return { redirect: `#/pago/${id}/comprobante` };
  const e = store.ent(d.dane), flash = takeFlash();
  const bloqueado = d.estado !== 'firmada';
  const previo = datosPago[id] || {};
  return {
    titulo: `Pagar · ${e.nombre}`,
    html: `${breadcrumb([{ label: 'Inicio', href: '#/' }, { label: 'Declaraciones masivas de sobretasa', href: '#/' }, { label: 'Pagar declaración' }])}
      <div class="app-pagehead"><div><h1 class="app-title" tabindex="-1">Pagar declaración · ${esc(e.nombre)}</h1>
      <p class="app-lead">El pago es individual por declaración. ${d.liq.extemporanea ? `La fecha límite fue el ${fecha(d.liq.fechaLimite)}.` : `Paga antes del ${fecha(d.liq.fechaLimite)} para evitar sanción e intereses.`}</p></div></div>
      ${flash ? aviso(flash.tipo, flash.titulo, esc(flash.mensaje)) : ''}
      ${bloqueado ? aviso('warning', 'Aún no se puede pagar', 'Solo se pagan declaraciones firmadas. Firma primero su grupo de firma.') : ''}
      ${d.liq.extemporanea ? aviso('warning', 'Declaración extemporánea', `El valor incluye ${pesos(d.liq.sancion)} de sanción y ${pesos(d.liq.intereses)} de intereses de mora.`) : ''}
      <div class="app-cols">
        <div class="app-main">
          <section class="app-card" aria-labelledby="dec-t"><h2 class="app-h3" id="dec-t">Declaración</h2>${encabezadoDeclaracion(d)}</section>
          <form class="app-card" id="form-pago" novalidate aria-labelledby="pse-t">
            <h2 class="app-h3" id="pse-t">Pago por PSE</h2>
            <div class="app-grid2">
              <div class="nxgov-field"><label class="nxgov-field__label" for="banco">Banco<span class="nxgov-field__required" aria-hidden="true">*</span></label>
                <div class="nxgov-select"><select class="nxgov-select__control" id="banco" name="banco" required ${bloqueado ? 'disabled' : ''}><option value="">Selecciona tu banco</option>${BANCOS_PSE.map((b) => `<option ${b === previo.banco ? 'selected' : ''}>${b}</option>`).join('')}</select>${icon('chevron-down', 'nxgov-select__icon')}</div></div>
              <div class="nxgov-field"><label class="nxgov-field__label" for="persona">Tipo de persona<span class="nxgov-field__required" aria-hidden="true">*</span></label>
                <div class="nxgov-select"><select class="nxgov-select__control" id="persona" name="persona" ${bloqueado ? 'disabled' : ''}><option>Persona jurídica</option><option ${previo.persona === 'Persona natural' ? 'selected' : ''}>Persona natural</option></select>${icon('chevron-down', 'nxgov-select__icon')}</div></div>
              <div class="nxgov-field"><label class="nxgov-field__label" for="correo">Correo para el comprobante<span class="nxgov-field__required" aria-hidden="true">*</span></label>
                <div class="nxgov-input"><input class="nxgov-input__control" id="correo" name="correo" type="email" autocomplete="email" required value="${esc(previo.correo || 'tesoreria@distribuidora.com.co')}" ${bloqueado ? 'disabled' : ''}></div></div>
            </div>
          </form>
        </div>
        <aside class="app-side">
          <section class="nxgov-summary" aria-labelledby="res-t"><h2 class="nxgov-summary__title" id="res-t">Resumen del pago</h2>
            <dl class="nxgov-summary__list">
              ${[['Impuesto', d.liq.impuesto], ['Sanción', d.liq.sancion, 'penalty'], ['Intereses de mora', d.liq.intereses, 'penalty'], ['Total a pagar', d.liq.total, 'total']].map(([l, v, m], i) => `<div class="nxgov-summary__item ${m ? `nxgov-summary__item--${m}` : ''}"><dt class="nxgov-summary__label"><span class="nxgov-summary__number" aria-hidden="true">${i + 1}</span>${l}</dt><dd class="nxgov-summary__value"><data value="${v}">${pesos(v)}</data></dd></div>`).join('')}
            </dl></section>
        </aside>
      </div>
      <div class="app-acciones app-acciones--between">${linkBtn('Volver al tablero', '#/declaraciones', { iconName: 'arrow-left' })}
        ${btn(`Pagar ${pesos(d.liq.total)} con PSE`, { variant: 'primary', iconName: 'lock', attrs: `data-pagar ${bloqueado ? 'disabled' : ''}` })}</div>`,
    bind: (root) => root.querySelector('[data-pagar]').addEventListener('click', () => {
      const banco = root.querySelector('#banco'), correo = root.querySelector('#correo');
      root.querySelectorAll('.nxgov-field__error').forEach((p) => p.remove());
      root.querySelectorAll('[aria-invalid]').forEach((i) => { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); });
      const errores = [];
      if (!banco.value) errores.push([banco, 'Selecciona el banco con el que vas a pagar.']);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.value.trim())) errores.push([correo, 'Escribe un correo válido para enviarte el comprobante.']);
      errores.forEach(([el, msg]) => { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', `${el.id}-error`); el.closest('.nxgov-field').insertAdjacentHTML('beforeend', `<p class="nxgov-field__error" id="${el.id}-error">${msg}</p>`); });
      if (errores.length) { errores[0][0].focus(); return; }
      datosPago[id] = { banco: banco.value, persona: root.querySelector('#persona').value, correo: correo.value.trim() };
      location.hash = `#/pago/${id}/pse`;
    }),
  };
}

export function vistaPse(id) {
  const d = store.declaracion(id);
  if (!d) return noExiste;
  if (d.estado === 'pagada') return { redirect: `#/pago/${id}/comprobante` };
  if (!datosPago[id] || d.estado !== 'firmada') return { redirect: `#/pago/${id}` };
  const e = store.ent(d.dane), p = datosPago[id];
  return {
    titulo: 'Pasarela PSE (simulada)',
    html: `<div class="app-pse">
      <p class="app-pse__marca">${icon('lock', 'app-pse__icon')} PSE · Pagos Seguros en Línea <span class="app-pse__demo">Simulación</span></p>
      <h1 class="app-title" tabindex="-1">Confirma el pago en ${esc(p.banco)}</h1>
      ${aviso('info', 'Pasarela de demostración', 'En la plataforma real aquí se abre el portal de tu banco. No se mueve dinero: elige el resultado que quieres probar.')}
      <dl class="app-datos">
        <div><dt>Comercio</dt><dd>${esc(e.nombre)} · Recaudo sobretasa a la gasolina</dd></div>
        <div><dt>Pagador</dt><dd>${esc(EMPRESA.razonSocial)} (${esc(p.persona)})</dd></div>
        <div><dt>Descripción</dt><dd>Sobretasa ${periodo(d)} · DANE ${esc(d.dane)}</dd></div>
        <div><dt>Valor</dt><dd><strong>${pesos(d.liq.total)}</strong></dd></div>
      </dl>
      <div class="app-acciones">${btn('Rechazar pago (demo)', { variant: 'danger', iconName: 'close', attrs: 'data-rechazar' })}${btn('Aprobar pago (demo)', { variant: 'primary', iconName: 'check', attrs: 'data-aprobar' })}</div></div>`,
    bind: (root) => root.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-aprobar], [data-rechazar]'); if (!t) return;
      // Un solo intento por visita: los dos botones quedan bloqueados mientras el banco responde.
      const botones = root.querySelectorAll('[data-aprobar], [data-rechazar]');
      if ([...botones].some((b) => b.disabled)) return;
      botones.forEach((b) => { b.disabled = true; });
      window.nxgov.setBusy?.(t, true, 'Procesando el pago');
      setTimeout(() => {
        if ('aprobar' in t.dataset) { store.pagar(id, p.banco); delete datosPago[id]; setFlash({ tipo: 'success', titulo: 'Pago aprobado', mensaje: `El banco aprobó el pago de ${pesos(d.liq.total)}.` }); location.hash = `#/pago/${id}/comprobante`; }
        else { setFlash({ tipo: 'danger', titulo: 'El banco rechazó el pago', mensaje: 'No se hizo ningún cobro. Revisa los datos o intenta con otro banco.' }); location.hash = `#/pago/${id}`; }
      }, 900);
    }),
  };
}

export function vistaComprobante(id) {
  const d = store.declaracion(id);
  if (!d) return noExiste;
  if (!d.pago) return { redirect: `#/pago/${id}` };
  const e = store.ent(d.dane), flash = takeFlash();
  return {
    titulo: `Comprobante · ${e.nombre}`,
    html: `${breadcrumb([{ label: 'Inicio', href: '#/' }, { label: 'Declaraciones masivas de sobretasa', href: '#/' }, { label: 'Comprobante de pago' }])}
      ${flash ? aviso(flash.tipo, flash.titulo, esc(flash.mensaje)) : ''}
      <div class="app-pagehead"><div><h1 class="app-title" tabindex="-1">Comprobante de pago</h1><p class="app-lead">${esc(e.nombre)} · ${periodo(d)}</p></div></div>
      <section class="app-card" aria-labelledby="comp-t"><h2 class="app-h3" id="comp-t">Datos del pago</h2>
        <dl class="app-datos">
          <div><dt>Referencia PSE</dt><dd>${esc(d.pago.referencia)}</dd></div>
          <div><dt>Banco</dt><dd>${esc(d.pago.banco)}</dd></div>
          <div><dt>Fecha y hora</dt><dd>${fechaHora(d.pago.fecha)}</dd></div>
          <div><dt>Valor pagado</dt><dd><strong>${pesos(d.pago.valor)}</strong></dd></div>
        </dl></section>
      <section class="app-card" aria-labelledby="dec-t"><h2 class="app-h3" id="dec-t">Declaración</h2>${encabezadoDeclaracion(d)}</section>
      <div class="app-acciones app-acciones--between app-no-print">${linkBtn('Volver al tablero', '#/declaraciones', { iconName: 'arrow-left' })}
        <div class="app-acciones">${linkBtn('Ver declaración', `#/declaracion/${d.id}`, { iconName: 'eye' })}${btn('Descargar comprobante', { variant: 'primary', iconName: 'download', attrs: 'data-imprimir' })}</div></div>`,
    bind: (root) => root.querySelector('[data-imprimir]').addEventListener('click', () => window.print()),
  };
}
