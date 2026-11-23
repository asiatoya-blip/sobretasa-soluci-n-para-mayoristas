// Mensajes de una sola vez entre vistas y estado de sesión de la interfaz (selección, filtros, carga en revisión).
let mensaje = null;
export const setFlash = (m) => { mensaje = m; };
export const takeFlash = () => { const m = mensaje; mensaje = null; return m; };

export const ui = {
  seleccion: new Set(),
  filtros: null, // { anio, mes, estado, q } — se inicializa con el periodo vigente
  pagina: 1,
  revision: null, // { archivo, resultado } mientras se revisa una carga
  grupoSeleccion: {}, // grupoId → declaración seleccionada en la vista de grupo
};
