// Cálculo simulado de la liquidación de sobretasa a la gasolina. Funciones puras (se prueban en tests/).
import { PARAMS, PRECIOS_REFERENCIA, PRODUCTOS, MESES } from './config.js';

const DAY = 86400000;
const redondear = (v) => Math.round(v / PARAMS.redondeo) * PARAMS.redondeo;

/** Periodo vigente = mes anterior a la fecha dada. */
export function periodoVigente(hoy) {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

export function periodoTexto(p) { return `${MESES[p.mes - 1]} de ${p.anio}`; }
export function periodoCorto(p) { const m = MESES[p.mes - 1]; return `${m[0].toUpperCase()}${m.slice(1)} ${p.anio}`; }
export function periodoClave(p) { return `${p.anio}-${String(p.mes).padStart(2, '0')}`; }

/** Fecha límite de presentación y pago: día límite de la entidad en el mes siguiente al periodo. */
export function fechaLimite(p, entidad) {
  return new Date(p.anio, p.mes, entidad.diaLimite, 23, 59, 59);
}

/** Meses o fracción de mes de retardo entre la fecha límite y hoy (0 si está a tiempo). */
export function mesesRetardo(limite, hoy) {
  if (hoy <= limite) return 0;
  let meses = (hoy.getFullYear() - limite.getFullYear()) * 12 + (hoy.getMonth() - limite.getMonth());
  if (hoy.getDate() > limite.getDate() || meses === 0) meses += 1;
  return Math.max(1, meses);
}

/**
 * Liquida una declaración.
 * @param {Object} volumenes  { [productoId]: [{ galones, alcohol }] }  (alcohol en %)
 */
export function liquidar(volumenes, entidad, periodo, hoy) {
  const productos = [];
  let galones = 0, gravados = 0, base = 0;
  for (const prod of PRODUCTOS) {
    const mezclas = (volumenes[prod.id] || []).filter((m) => m.galones > 0);
    if (!mezclas.length) continue;
    const precio = PRECIOS_REFERENCIA[prod.ref].valor;
    let pGal = 0, pGrav = 0;
    for (const m of mezclas) {
      pGal += m.galones;
      pGrav += m.galones * (1 - (m.alcohol || 0) / 100);
    }
    const pBase = pGrav * precio;
    productos.push({ id: prod.id, nombre: prod.nombre, galones: pGal, galonesGravados: pGrav, precioReferencia: precio, base: pBase,
      impuesto: pBase * entidad.tarifa / 100, mezclas });
    galones += pGal; gravados += pGrav; base += pBase;
  }
  const impuesto = redondear(base * entidad.tarifa / 100);
  const limite = fechaLimite(periodo, entidad);
  const meses = mesesRetardo(limite, hoy);
  let sancion = 0, intereses = 0;
  if (meses > 0) {
    const minima = redondear(PARAMS.sancionMinimaUvt * PARAMS.uvt);
    sancion = redondear(Math.max(Math.min(impuesto * PARAMS.sancionPorMes * meses, impuesto), minima));
    const dias = Math.ceil((hoy - limite) / DAY);
    intereses = redondear(impuesto * PARAMS.tasaMoraAnual / 365 * dias);
  }
  return {
    tarifa: entidad.tarifa, productos, galones, galonesGravados: gravados, base: Math.round(base), impuesto,
    fechaLimite: limite.toISOString(), extemporanea: meses > 0, mesesRetardo: meses, sancion, intereses,
    total: impuesto + sancion + intereses, calculadaEl: hoy.toISOString(),
  };
}
