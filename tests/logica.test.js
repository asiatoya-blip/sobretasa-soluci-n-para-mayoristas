// Pruebas de la lógica pura: cálculo y validación del archivo de ejemplo. Ejecutar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodoVigente, fechaLimite, mesesRetardo, liquidar } from '../assets/app/calc.js';
import { validarArchivo, numero } from '../assets/app/validate.js';
import { filasEjemplo } from '../assets/app/ejemplo.js';
import { ENTIDADES, PARAMS } from '../assets/app/config.js';
import { letra } from '../assets/app/xlsx.js';

const ent = (dane) => ENTIDADES.find((e) => e.dane === dane);

test('periodo vigente es el mes anterior (también en enero)', () => {
  assert.deepEqual(periodoVigente(new Date(2026, 10, 23)), { anio: 2026, mes: 10 });
  assert.deepEqual(periodoVigente(new Date(2027, 0, 5)), { anio: 2026, mes: 12 });
});

test('fecha límite y meses de retardo', () => {
  const lim = fechaLimite({ anio: 2026, mes: 10 }, ent('25175'));
  assert.equal(lim.getDate(), 8); assert.equal(lim.getMonth(), 10);
  assert.equal(mesesRetardo(lim, new Date(2026, 10, 8, 12)), 0);
  assert.equal(mesesRetardo(lim, new Date(2026, 10, 23)), 1);
  assert.equal(mesesRetardo(lim, new Date(2027, 0, 9)), 3);
});

test('liquidación a tiempo: descuenta alcohol, redondea a mil y no tiene sanción', () => {
  const v = { cte: [{ galones: 1000 }], cteOx: [{ galones: 1000, alcohol: 10 }] };
  const l = liquidar(v, ent('25175'), { anio: 2026, mes: 10 }, new Date(2026, 10, 3));
  assert.equal(l.galones, 2000);
  assert.equal(l.galonesGravados, 1900);
  assert.equal(l.impuesto % PARAMS.redondeo, 0);
  assert.equal(l.sancion, 0); assert.equal(l.intereses, 0);
  assert.equal(l.total, l.impuesto);
});

test('liquidación extemporánea: sanción con mínimo y tope, más intereses', () => {
  const l = liquidar({ cte: [{ galones: 10 }] }, ent('25175'), { anio: 2026, mes: 10 }, new Date(2026, 10, 23));
  assert.ok(l.extemporanea);
  assert.equal(l.sancion, Math.round(PARAMS.sancionMinimaUvt * PARAMS.uvt / 1000) * 1000); // impuesto pequeño → sanción mínima
  const g = liquidar({ cte: [{ galones: 50000 }] }, ent('25175'), { anio: 2026, mes: 10 }, new Date(2026, 10, 23));
  assert.ok(g.sancion <= g.impuesto && g.intereses > 0);
  assert.equal(g.total, g.impuesto + g.sancion + g.intereses);
});

test('números en formato es-CO', () => {
  assert.equal(numero('12.450'), 12450);
  assert.equal(numero('10,5'), 10.5);
  assert.equal(numero(800), 800);
});

test('el archivo de ejemplo da 12 filas válidas y 3 con error', () => {
  const hoy = new Date(2026, 10, 23), P = periodoVigente(hoy);
  const crudas = filasEjemplo(P, { anio: 2026, mes: 11 });
  const filas = crudas.map((r, i) => ({ fila: i + 3, celdas: Object.fromEntries(r.map((v, j) => [letra(j), v])) }));
  const declaraciones = []; // la demo arranca vacía
  const r = validarArchivo(filas, { declaraciones, hoy, periodo: P });
  assert.deepEqual(r.errorArchivo, []);
  const conError = r.filas.filter((f) => f.errores.length);
  assert.equal(r.filas.length - conError.length, 12);
  assert.deepEqual(conError.map((f) => f.dane).sort(), ['05001', '25269', '85410']);
  assert.ok(r.filas.find((f) => f.dane === '25473').advertencias.length, 'Mosquera (6 % de alcohol) tiene advertencia');
  assert.ok(r.filas.filter((f) => !f.errores.length).every((f) => f.liquidacion.total > 0));
});
