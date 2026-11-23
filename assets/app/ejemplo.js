// Archivo de ejemplo diligenciado para el periodo vigente: filas válidas + casos que la revisión debe detectar.
import { crearXlsx, ENCABEZADO_PLANTILLA } from './xlsx.js';
import { periodoVigente, periodoClave } from './calc.js';
import { MESES } from './config.js';

// [dane, cte, cteOx(gal,%) , ext, extOx(gal,%), importada, zf]
const VALIDAS = [
  ['25269', 12450, [3200, 10], 1840, [600, 10]],
  ['50001', 28700, [5400, 10], 3950, [900, 10]],
  ['15001', 15300, [2100, 10], 2240, null],
  ['15238', 9800, null, 1320, null],
  ['15759', 11250, [1800, 10], 1610, null],
  ['25430', 10400, null, 1480, [350, 10]],
  ['25473', 9650, [1500, 6], 1350, null], // % alcohol fuera de rango → advertencia
  ['25290', 13900, [2600, 10], 1790, null],
  ['25817', 7600, null, 1040, null],
  ['15', 41800, [6800, 10], 5600, [1200, 10]],
  ['11001', 98500, [14800, 10], 16200, [3100, 10]],
  ['25', 64300, [9800, 10], 7900, [1500, 10]],
];

/** Filas del ejemplo para un periodo (año, mes) dado; incluye 3 filas con error para mostrar la revisión. */
export function filasEjemplo(periodo, actual) {
  const fila = (dane, p, cte, cteOx, ext, extOx, imp = '', zf = '') => {
    const r = new Array(25).fill('');
    r[0] = dane; r[1] = p.mes; r[2] = p.anio; r[3] = cte;
    if (cteOx) { r[4] = cteOx[0]; r[5] = cteOx[1]; }
    r[10] = ext;
    if (extOx) { r[11] = extOx[0]; r[12] = extOx[1]; }
    r[17] = imp; r[18] = zf;
    return r;
  };
  const filas = VALIDAS.map(([d, c, co, e, eo]) => fila(d, periodo, c, co, e, eo));
  filas.push(fila('05001', periodo, 30500, null, 4100, null)); // Medellín: entidad no habilitada → error
  filas.push(fila('25269', periodo, 11800, null, 1600, null)); // Facatativá repetida en el archivo → error duplicado
  filas.push(fila('85410', actual, 8400, null, 1100, null)); // Tauramena: periodo en curso → error
  return filas;
}

export function descargarEjemplo(hoy) {
  const P = periodoVigente(hoy);
  const actual = { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
  const blob = crearXlsx({ ...ENCABEZADO_PLANTILLA, filas: [...ENCABEZADO_PLANTILLA.filas, ...filasEjemplo(P, actual)] });
  descargar(blob, `Ejemplo_Declaraciones_${MESES[P.mes - 1]}_${P.anio}.xlsx`);
}

export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { periodoClave };
