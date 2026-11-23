// Prevalidación de la plantilla: revisa cada fila antes de crear nada (paso 2 «Revisar y generar»).
import { ENTIDADES, MESES, PARAMS, PRODUCTOS } from './config.js';
import { liquidar, periodoClave, periodoCorto } from './calc.js';

const HEADER_A1 = 'código dane';

function texto(v) { return v === undefined || v === null ? '' : String(v).trim(); }

/** Número desde celda Excel (número o texto es-CO «12.450,5»). null = vacío, NaN = inválido. */
export function numero(v) {
  if (v === undefined || v === null || texto(v) === '') return null;
  if (typeof v === 'number') return v;
  const s = texto(v).replace(/\s/g, '');
  const norm = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[.,](?=\d{3}(\D|$))/g, '');
  const n = Number(norm);
  return Number.isFinite(n) ? n : NaN;
}

function mesDe(v) {
  const n = numero(v);
  if (n !== null && !Number.isNaN(n)) return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
  const i = MESES.indexOf(texto(v).toLowerCase());
  return i >= 0 ? i + 1 : null;
}

/**
 * @param {Array<{fila:number, celdas:Object}>} filas  celdas por letra de columna, desde la fila 3 de la hoja.
 * @param {{ declaraciones:Array, hoy:Date, periodo:{anio,mes} }} ctx
 */
export function validarArchivo(filas, ctx) {
  const errorArchivo = [];
  const datos = filas.filter((f) => Object.values(f.celdas).some((v) => texto(v) !== ''));
  if (!datos.length) errorArchivo.push('El archivo no tiene filas con datos. Diligencia la plantilla desde la fila 3.');
  else if (datos.length < PARAMS.minFilas) errorArchivo.push(`La carga masiva necesita al menos ${PARAMS.minFilas} declaraciones; el archivo tiene ${datos.length}.`);
  else if (datos.length > PARAMS.maxFilas) errorArchivo.push(`Puedes cargar máximo ${PARAMS.maxFilas} declaraciones por archivo; el archivo tiene ${datos.length}. Divídelo en varias cargas.`);

  const vistos = new Map();
  const resultado = datos.map((f) => validarFila(f, ctx, vistos));
  return { errorArchivo, filas: resultado };
}

function validarFila({ fila, celdas }, ctx, vistos) {
  const errores = [], advertencias = [];
  const err = (columna, problema, solucion) => errores.push({ columna, problema, solucion });
  const adv = (columna, problema, solucion) => advertencias.push({ columna, problema, solucion });

  const dane = texto(celdas.A).replace(/\.0$/, '');
  const entidad = ENTIDADES.find((e) => e.dane === dane);
  if (!dane) err('Código DANE', 'La fila no tiene código DANE.', 'Escribe el código DANE de la entidad (5 dígitos para municipios, 2 para departamentos).');
  else if (!entidad) err('Código DANE', `El código ${dane} no corresponde a una entidad habilitada para declarar en esta plataforma.`, 'Consulta el listado de entidades disponibles o preséntala en el portal de la entidad.');

  const mes = mesDe(celdas.B);
  const anioN = numero(celdas.C);
  const anio = anioN !== null && Number.isInteger(anioN) && anioN > 2000 && anioN < 2100 ? anioN : null;
  if (!mes) err('Mes periodo gravable', 'El mes no es válido.', 'Escribe el mes como número (1 a 12) o con su nombre.');
  if (!anio) err('Año periodo gravable', 'El año no es válido.', 'Escribe el año con 4 dígitos, por ejemplo 2026.');

  let periodo = null;
  if (mes && anio) {
    periodo = { anio, mes };
    const clave = periodoClave(periodo), vigente = periodoClave(ctx.periodo);
    if (clave > vigente) err('Mes periodo gravable', `El periodo ${periodoCorto(periodo)} aún no ha terminado.`, `Solo puedes declarar hasta ${periodoCorto(ctx.periodo)}.`);
  }

  const volumenes = {};
  let hayGalones = false;
  for (const prod of PRODUCTOS) {
    volumenes[prod.id] = [];
    prod.mezclas.forEach((m, i) => {
      const nombre = `${prod.nombre}${prod.mezclas.length > 1 ? ` · mezcla ${i + 1}` : ''}`;
      const g = numero(celdas[m.gal]);
      const a = m.alc ? numero(celdas[m.alc]) : null;
      if (g === null && (a === null || a === 0)) return;
      if (Number.isNaN(g) || (g !== null && g < 0)) { err(`${nombre} (col. ${m.gal})`, 'Los galones no son un número válido.', 'Escribe solo números, sin letras ni signos.'); return; }
      if (g === null || g === 0) { if (a) adv(`${nombre} (col. ${m.alc})`, 'Hay % de alcohol pero no hay galones.', 'Revisa si faltan los galones de esta mezcla.'); return; }
      let alc = 0;
      if (m.alc) {
        if (a === null) { err(`${nombre} (col. ${m.alc})`, 'Falta el % de alcohol carburante de la mezcla.', 'Escribe el porcentaje de alcohol carburante (por ejemplo 10).'); return; }
        if (Number.isNaN(a) || a < 0 || a > 100) { err(`${nombre} (col. ${m.alc})`, 'El % de alcohol carburante no es válido.', 'Escribe un porcentaje entre 0 y 100.'); return; }
        alc = a > 0 && a <= 1 ? a * 100 : a;
        if (alc < PARAMS.alcoholHabitualMin || alc > PARAMS.alcoholHabitualMax) adv(`${nombre} (col. ${m.alc})`, `El % de alcohol carburante (${alc} %) está fuera del rango habitual (${PARAMS.alcoholHabitualMin} a ${PARAMS.alcoholHabitualMax} %).`, 'Confírmalo con tu soporte de ventas. Puedes continuar.');
      }
      volumenes[prod.id].push({ galones: g, alcohol: alc });
      hayGalones = true;
    });
  }
  if (!hayGalones && !errores.length) err('Galones', 'La fila no tiene galones en ningún producto.', 'Escribe los galones vendidos o quita la fila si no hubo ventas.');

  if (entidad && periodo) {
    const clave = `${entidad.dane}|${periodoClave(periodo)}`;
    if (vistos.has(clave)) err('Código DANE', `La entidad está repetida en el archivo para ${periodoCorto(periodo)} (fila ${vistos.get(clave)}).`, 'Deja una sola fila por entidad y periodo.');
    else vistos.set(clave, fila);
    const existente = ctx.declaraciones.find((d) => d.dane === entidad.dane && d.anio === periodo.anio && d.mes === periodo.mes);
    if (existente) err('Mes y año', `Ya existe una declaración de ${periodoCorto(periodo)} para esta entidad (N.° ${existente.numero}).`, existente.estado === 'borrador' ? 'Si quieres reemplazarla, elimina el borrador desde el tablero.' : 'Esa declaración ya está en firma o firmada; las correcciones se presentan ante la entidad.');
  }

  let liquidacion = null;
  // La extemporaneidad no es advertencia por fila: se informa en la liquidación y en un aviso general del paso 2.
  if (!errores.length) liquidacion = liquidar(volumenes, entidad, periodo, ctx.hoy);
  return { fila, dane, entidad, periodo, volumenes, errores, advertencias, liquidacion };
}

/** Comprueba que la hoja tenga el encabezado de la plantilla. */
export function esPlantilla(filasCrudas) {
  return texto(filasCrudas[1]?.A).toLowerCase() === HEADER_A1;
}
