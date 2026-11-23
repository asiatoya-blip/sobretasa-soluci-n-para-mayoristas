// Estado del prototipo (localStorage). Empieza vacío; «Reiniciar datos» vuelve a ese punto.
import { ENTIDADES, ROLES_FIRMANTE } from './config.js';

const KEY = 'sogas-mayoristas-v1';
const hoyReal = () => new Date();

let state = null;
const listeners = new Set();

export const hoy = () => hoyReal();
export const getState = () => state;
export const subscribe = (fn) => listeners.add(fn);

function save() { localStorage.setItem(KEY, JSON.stringify(state)); listeners.forEach((fn) => fn(state)); }

export function load() {
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  if (!state || state.version !== 3) { state = seed(); save(); }
  return state;
}

export function reset() { state = seed(); save(); }

const entidad = (dane) => ENTIDADES.find((e) => e.dane === dane);
// La demo arranca vacía: quien prueba hace su primera carga desde cero.
function seed() {
  return { version: 3, creado: hoyReal().toISOString(), seq: { decl: 0, carga: 0, grupo: 0, pago: 1000 }, cargas: [], grupos: [], declaraciones: [] };
}

// ---------- Consultas ----------
export const ent = entidad;
export const declaracion = (id) => state.declaraciones.find((d) => d.id === id);
export const grupo = (id) => state.grupos.find((g) => g.id === id);
export const declaracionesDe = (gid) => state.declaraciones.filter((d) => d.grupoId === gid);

export function firmantesCompletos(d) {
  const e = entidad(d.dane);
  const roles = d.firmantes.map((f) => f.rol);
  const datosOk = d.firmantes.length > 0 && d.firmantes.every((f) => f.nombre && f.documento && f.correo && (f.rol === 'Declarante principal' || f.tp));
  return datosOk && roles.includes('Declarante principal') && (!e.exigeRevisor || roles.includes('Revisor fiscal') || roles.includes('Contador'));
}

export function estadoGrupo(g) {
  const ds = declaracionesDe(g.id);
  if (!ds.length) return 'vacio';
  if (ds.every((d) => d.estado === 'firmada' || d.estado === 'pagada')) return 'firmado';
  if (g.enviado) return 'en-firma';
  if (ds.every(firmantesCompletos)) return 'listo';
  return 'sin-firmantes';
}
export const grupoEditable = (g) => ['sin-firmantes', 'listo', 'vacio'].includes(estadoGrupo(g));

// ---------- Acciones ----------
function limpiarGruposVacios() { state.grupos = state.grupos.filter((g) => declaracionesDe(g.id).length > 0); }

export function generar(archivo, filas) {
  const validas = filas.filter((f) => !f.errores.length);
  const c = { id: `c${++state.seq.carga}`, numero: state.seq.carga, archivo, fecha: hoyReal().toISOString(), filas: filas.length, generadas: validas.length, rechazadas: filas.length - validas.length };
  state.cargas.push(c);
  const g = { id: `g${++state.seq.grupo}`, nombre: `Carga N.° ${c.numero}`, origen: 'carga', cargaId: c.id, creado: c.fecha, enviado: false };
  state.grupos.push(g);
  const ids = validas.map((f) => {
    const d = { id: `d${++state.seq.decl}`, numero: state.seq.decl, dane: f.entidad.dane, anio: f.periodo.anio, mes: f.periodo.mes, estado: 'borrador',
      cargaId: c.id, grupoId: g.id, volumenes: f.volumenes, liq: f.liquidacion, firmantes: [], creada: c.fecha, pago: null };
    state.declaraciones.push(d); return d.id;
  });
  save();
  return { carga: c, grupo: g, ids };
}

export function crearGrupo(ids, nombre) {
  const g = { id: `g${++state.seq.grupo}`, nombre: nombre || `Grupo N.° ${state.seq.grupo}`, origen: 'manual', creado: hoyReal().toISOString(), enviado: false };
  state.grupos.push(g);
  ids.forEach((id) => { declaracion(id).grupoId = g.id; });
  limpiarGruposVacios(); save();
  return g;
}

export function moverAGrupo(gid, ids) { ids.forEach((id) => { declaracion(id).grupoId = gid; }); limpiarGruposVacios(); save(); }

/** Quitar del grupo: la declaración queda sola, en un grupo nuevo «Sin grupo» no; pasa a no tener grupo. */
export function quitarDeGrupo(id) { declaracion(id).grupoId = null; limpiarGruposVacios(); save(); }

export function guardarFirmantes(id, firmantes) { declaracion(id).firmantes = firmantes; save(); }
export function copiarFirmantesAGrupo(gid, firmantes) { declaracionesDe(gid).forEach((d) => { d.firmantes = firmantes.map((f) => ({ ...f })); }); save(); }

export function enviarAFirma(gid) {
  const g = grupo(gid); g.enviado = true; g.enviadoEl = hoyReal().toISOString();
  declaracionesDe(gid).forEach((d) => { if (d.estado === 'borrador') d.estado = 'pendiente'; });
  save();
}

export function simularFirma(gid) { declaracionesDe(gid).forEach((d) => { if (d.estado === 'pendiente') { d.estado = 'firmada'; d.firmadaEl = hoyReal().toISOString(); } }); save(); }

export function pagar(id, banco) {
  const d = declaracion(id);
  d.estado = 'pagada';
  d.pago = { referencia: `PSE-${++state.seq.pago}`, banco, fecha: hoyReal().toISOString(), valor: d.liq.total };
  save();
  return d.pago;
}

export function eliminarBorrador(id) { state.declaraciones = state.declaraciones.filter((d) => d.id !== id); limpiarGruposVacios(); save(); }

export const ROLES = ROLES_FIRMANTE;
