// Enrutador del prototipo (hash). Cada vista devuelve HTML y, opcionalmente, una función que enlaza sus eventos.
import * as store from './store.js';
import { registrarIconos, modal, btn, esc } from './ui.js';
import { vistaTablero } from './views/tablero.js';
import { vistaCarga, vistaRevision } from './views/carga.js';
import { vistaGrupo } from './views/grupo.js';
import { vistaDetalle } from './views/detalle.js';
import { vistaPago, vistaPse, vistaComprobante } from './views/pago.js';
import { vistaAyuda } from './views/ayuda.js';

let app = document.getElementById('app');

const RUTAS = [
  [/^\/?$/, () => vistaTablero('declaraciones')],
  [/^\/declaraciones$/, () => vistaTablero('declaraciones')],
  [/^\/entidades$/, () => vistaTablero('entidades')],
  [/^\/grupos$/, () => vistaTablero('grupos')],
  [/^\/carga$/, () => vistaCarga()],
  [/^\/carga\/revision$/, () => vistaRevision()],
  [/^\/grupo\/([\w-]+)$/, (m) => vistaGrupo(m[1])],
  [/^\/declaracion\/([\w-]+)$/, (m) => vistaDetalle(m[1])],
  [/^\/pago\/([\w-]+)$/, (m) => vistaPago(m[1])],
  [/^\/pago\/([\w-]+)\/pse$/, (m) => vistaPse(m[1])],
  [/^\/pago\/([\w-]+)\/comprobante$/, (m) => vistaComprobante(m[1])],
  [/^\/ayuda\/(tutorial|manual)$/, (m) => vistaAyuda(m[1])],
];

let primera = true;
export function render() {
  const ruta = decodeURIComponent(location.hash.replace(/^#/, '').split('?')[0]) || '/';
  const hit = RUTAS.find(([re]) => re.test(ruta));
  const vista = hit ? hit[1](ruta.match(hit[0])) : { titulo: 'Página no encontrada', html: `<h1 tabindex="-1">Página no encontrada</h1><p><a href="#/">Volver al tablero</a></p>` };
  if (vista.redirect) { location.hash = vista.redirect; return; }
  document.title = `${vista.titulo} · Sobretasa mayoristas`;
  // Contenedor nuevo en cada render: los listeners de la vista anterior se descartan con él.
  const nuevo = app.cloneNode(false); app.replaceWith(nuevo); app = nuevo;
  app.innerHTML = `<div class="nxgov-alert-region app-avisos" id="avisos"></div>${vista.html}`;
  vista.bind?.(app);
  window.nxgov?.stepper?.init?.(app);
  window.nxgov?.fileUpload?.init?.(app);
  if (!primera) { window.scrollTo({ top: 0, behavior: 'instant' }); app.querySelector('h1')?.focus(); }
  primera = false;
  vista.after?.();
}

function configuracion() {
  modal({
    variante: 'info', icono: 'cog', titulo: 'Configuración',
    cuerpo: `<p>En la plataforma real, este botón lleva a la <strong>consola administrativa</strong>: entidades habilitadas, parámetros de cada entidad (tarifas, fechas y sanciones), usuarios y firmantes.</p>
      <p>En este prototipo puedes borrar todo lo que has hecho y empezar de cero.</p>`,
    acciones: `${btn('Cerrar', { attrs: 'data-nxgov-modal-close="cerrar" autofocus' })}${btn('Reiniciar datos de la demo', { variant: 'danger', iconName: 'refresh', attrs: 'data-nxgov-modal-close="reset"' })}`,
  }).then((v) => { if (v === 'reset') { store.reset(); location.hash = '#/'; render(); } });
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-app-config]');
  if (t) { e.preventDefault(); configuracion(); }
  const r = e.target.closest('[data-app-reset]');
  if (r) { e.preventDefault(); configuracion(); }
});

store.load();
registrarIconos();
window.addEventListener('hashchange', render);
render();
document.getElementById('hoy-demo').textContent = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
export { esc };
