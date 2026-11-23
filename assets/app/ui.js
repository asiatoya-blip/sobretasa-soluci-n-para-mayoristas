// Utilidades de interfaz sobre la librería nxgov (window.nxgov: alert, modal, flyout, fileUpload, stepper).
import { MESES } from './config.js';

/** Escapa texto para insertarlo en plantillas HTML. Todo dato que venga del archivo o del usuario pasa por aquí. */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const pesos = (n) => `$ ${Math.round(n || 0).toLocaleString('es-CO')}`;
export const num = (n, dec = 0) => (n || 0).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const fecha = (iso) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
export const fechaHora = (iso) => { const d = new Date(iso); return `${fecha(iso)} · ${d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`; };
export const periodo = (d) => { const m = MESES[d.mes - 1]; return `${m[0].toUpperCase()}${m.slice(1)} ${d.anio}`; };

export const ESTADOS = {
  borrador: { texto: 'Borrador', tag: 'neutral', mensaje: 'Generada. Revísala y fírmala para continuar.' },
  pendiente: { texto: 'Pendiente de firma', tag: 'pending', mensaje: 'Esperando la firma de los firmantes.' },
  firmada: { texto: 'Firmada', tag: 'signed', mensaje: 'Firmada. Págala antes de la fecha límite de la entidad.' },
  pagada: { texto: 'Pagada', tag: 'completed', mensaje: 'Pago registrado. Puedes descargar el comprobante.' },
};
export const ESTADOS_GRUPO = {
  'sin-firmantes': { texto: 'Sin firmantes', tag: 'neutral' },
  listo: { texto: 'Sin enviar', tag: 'neutral' },
  'en-firma': { texto: 'En firma', tag: 'pending' },
  firmado: { texto: 'Firmado', tag: 'completed' },
  vacio: { texto: 'Vacío', tag: 'neutral' },
};

export const tag = (texto, tipo) => `<span class="nxgov-tag nxgov-tag--${tipo}">${esc(texto)}</span>`;
export const icon = (name, cls = 'nxgov-button__icon') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#nxgov-icon-${name}"></use></svg>`;

/** Botón nxgov. variant: primary | outline | danger. attrs: atributos extra en texto. sr: contexto oculto. */
export function btn(label, { variant = 'outline', iconName, iconAfter = false, attrs = '', sr = '' } = {}) {
  const ic = iconName ? icon(iconName) : '';
  const lab = `<span class="nxgov-button__label">${esc(label)}${sr ? `<span class="nxgov-sr-only"> ${esc(sr)}</span>` : ''}</span>`;
  return `<button type="button" class="nxgov-button nxgov-button--${variant}" ${attrs}>${iconAfter ? lab + ic : ic + lab}</button>`;
}
export function linkBtn(label, href, { variant = 'outline', iconName, attrs = '' } = {}) {
  return `<a class="nxgov-button nxgov-button--${variant}" href="${esc(href)}" ${attrs}>${iconName ? icon(iconName) : ''}<span class="nxgov-button__label">${esc(label)}</span></a>`;
}

export function aviso(tipo, titulo, mensaje, accion = '') {
  const pref = { info: 'Información: ', success: 'Éxito: ', warning: 'Advertencia: ', danger: 'Error: ' }[tipo];
  const ic = { info: 'info', success: 'success', warning: 'warning', danger: 'error' }[tipo];
  return `<div class="nxgov-alert nxgov-alert--${tipo}" data-nxgov-component="alert">${icon(ic, 'nxgov-alert__icon')}
    <div class="nxgov-alert__content">${titulo ? `<p class="nxgov-alert__title"><span class="nxgov-sr-only">${pref}</span>${esc(titulo)}</p>` : ''}
    <p class="nxgov-alert__message">${titulo ? '' : `<span class="nxgov-sr-only">${pref}</span>`}${mensaje}</p>${accion}</div></div>`;
}

/** Muestra un aviso anunciado (role=status/alert) en la región #avisos. */
export function notificar(variant, message, title) {
  const region = document.getElementById('avisos');
  if (region && window.nxgov?.alert) window.nxgov.alert.show(region, { variant, message, title });
}

export function breadcrumb(items) {
  return `<nav class="nxgov-breadcrumb" aria-label="Miga de pan"><ol class="nxgov-breadcrumb__list">${items.map((it, i) => i < items.length - 1
    ? `<li class="nxgov-breadcrumb__item"><a class="nxgov-breadcrumb__link" href="${esc(it.href)}">${esc(it.label)}</a>${icon('chevron-compact', 'nxgov-breadcrumb__separator')}</li>`
    : `<li class="nxgov-breadcrumb__item"><span class="nxgov-breadcrumb__current" aria-current="page">${esc(it.label)}</span></li>`).join('')}</ol></nav>`;
}

export function sectionHeading(id, titulo, descripcion, iconName = 'check-double', nivel = 2) {
  return `<div class="nxgov-section-heading"><span class="nxgov-section-heading__icon" aria-hidden="true">${icon(iconName, 'nxgov-section-heading__glyph')}</span>
    <div class="nxgov-section-heading__text"><h${nivel} class="nxgov-section-heading__title" id="${id}">${esc(titulo)}</h${nivel}>
    ${descripcion ? `<p class="nxgov-section-heading__description">${esc(descripcion)}</p>` : ''}</div></div>`;
}

export function stepper(actual) {
  const pasos = ['Cargar archivo', 'Revisar y generar'];
  return `<nav class="nxgov-stepper" data-nxgov-component="stepper" data-nxgov-current="${actual}" data-nxgov-max="${actual}" data-nxgov-navigation="none" aria-label="Progreso de la carga masiva">
    <p class="nxgov-stepper__summary"><span class="nxgov-stepper__summary-count">Paso ${actual} de 2</span> <span class="nxgov-stepper__summary-label">${pasos[actual - 1]}</span></p>
    <div class="nxgov-stepper__track" aria-hidden="true"><span class="nxgov-stepper__bar"></span></div>
    <ol class="nxgov-stepper__list">${pasos.map((p, i) => {
      const n = i + 1, st = n < actual ? 'completed' : n === actual ? 'active' : 'upcoming';
      return `<li class="nxgov-stepper__step nxgov-stepper__step--${st}" data-nxgov-step="${n}" ${n === actual ? 'aria-current="step"' : ''}><span class="nxgov-stepper__control"><span class="nxgov-stepper__marker" aria-hidden="true"><span class="nxgov-stepper__number">${n}</span>${icon('check', 'nxgov-stepper__check')}</span><span class="nxgov-stepper__label">${p}</span><span class="nxgov-stepper__state nxgov-sr-only">${st === 'completed' ? ', completado' : st === 'upcoming' ? ', pendiente' : ''}</span></span></li>`;
    }).join('')}</ol></nav>`;
}

export function helpPanel(titulo) {
  return `<aside class="nxgov-help nxgov-help--horizontal" aria-labelledby="ayuda-title"><h2 class="nxgov-help__title" id="ayuda-title">${esc(titulo)}</h2>
    <ul class="nxgov-help__list" role="list">
      <li class="nxgov-help__item"><a class="nxgov-help__link" href="#/ayuda/tutorial"><span class="nxgov-help__text">Ver el tutorial</span><span class="nxgov-help__icon" aria-hidden="true">${icon('eye', 'nxgov-help__glyph')}</span></a></li>
      <li class="nxgov-help__item"><a class="nxgov-help__link" href="#/ayuda/manual"><span class="nxgov-help__text">Manual de uso</span><span class="nxgov-help__icon" aria-hidden="true">${icon('file-alt', 'nxgov-help__glyph')}</span></a></li>
    </ul></aside>`;
}

// ---------- Modales y paneles (reutilizan nxgov.modal / nxgov.flyout) ----------
const host = () => document.getElementById('dialogos');
let seqId = 0;

/** Abre un modal nxgov y resuelve con el valor del botón data-nxgov-modal-close. */
export function modal({ variante = 'info', icono = 'info', titulo, cuerpo, acciones }) {
  const id = `modal-${++seqId}`;
  host().insertAdjacentHTML('beforeend', `<dialog class="nxgov-modal nxgov-modal--${variante}" id="${id}" aria-labelledby="${id}-t" aria-describedby="${id}-m">
    <div class="nxgov-modal__panel">${icon(icono, 'nxgov-modal__icon')}<h2 class="nxgov-modal__title" id="${id}-t" tabindex="-1">${esc(titulo)}</h2>
    <div class="nxgov-modal__message" id="${id}-m">${cuerpo}</div><div class="nxgov-modal__actions">${acciones}</div></div></dialog>`);
  const el = document.getElementById(id);
  return window.nxgov.modal.open(el).then((v) => { setTimeout(() => el.remove(), 400); return v; });
}

/** Panel lateral nxgov-flyout. Devuelve el <dialog>; el contenido lo maneja quien llama. */
export function panel({ titulo, subtitulo = '', cuerpo }) {
  const id = `panel-${++seqId}`;
  host().insertAdjacentHTML('beforeend', `<dialog class="nxgov-flyout app-panel" id="${id}" aria-labelledby="${id}-t" data-nxgov-component="flyout">
    <div class="nxgov-flyout__panel"><header class="nxgov-flyout__header"><div><h2 class="nxgov-flyout__title" id="${id}-t">${esc(titulo)}</h2>${subtitulo ? `<p class="app-panel__sub">${esc(subtitulo)}</p>` : ''}</div>
    <button type="button" class="nxgov-button nxgov-button--outline" data-nxgov-flyout-close><span class="nxgov-button__label">Cerrar<span class="nxgov-sr-only"> panel</span></span>${icon('close')}</button></header>
    <div class="nxgov-flyout__body">${cuerpo}</div></div></dialog>`);
  const el = document.getElementById(id);
  el.addEventListener('close', () => setTimeout(() => el.remove(), 400));
  window.nxgov.flyout.open(el);
  return el;
}
export const cerrarPanel = (el) => window.nxgov.flyout.close(el);

// ---------- Íconos que no trae el sprite nxgov ----------
const EXTRA = {
  'layer-group': 'M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z',
  cog: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  print: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
  refresh: 'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
  'arrow-left': 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
};
export function registrarIconos() {
  const sprite = document.getElementById('nxgov-icon-sprite');
  if (!sprite) return;
  for (const [n, d] of Object.entries(EXTRA)) {
    if (document.getElementById(`nxgov-icon-${n}`)) continue;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    s.setAttribute('id', `nxgov-icon-${n}`); s.setAttribute('viewBox', '0 0 24 24');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'currentColor');
    s.appendChild(p); sprite.appendChild(s);
  }
}
