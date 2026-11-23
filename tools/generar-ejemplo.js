// Genera una copia estática del ejemplo diligenciado en plantillas/ (la app genera la suya con la fecha real).
// Uso: node tools/generar-ejemplo.js [AAAA-MM-DD]
import { writeFileSync } from 'node:fs';
import { crearXlsx, ENCABEZADO_PLANTILLA } from '../assets/app/xlsx.js';
import { filasEjemplo } from '../assets/app/ejemplo.js';
import { periodoVigente } from '../assets/app/calc.js';
import { MESES } from '../assets/app/config.js';

const hoy = process.argv[2] ? new Date(`${process.argv[2]}T12:00:00`) : new Date();
const P = periodoVigente(hoy);
const blob = crearXlsx({ ...ENCABEZADO_PLANTILLA, filas: [...ENCABEZADO_PLANTILLA.filas, ...filasEjemplo(P, { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 })] });
const ruta = new URL(`../plantillas/Ejemplo_Declaraciones_${MESES[P.mes - 1]}_${P.anio}.xlsx`, import.meta.url);
writeFileSync(ruta, Buffer.from(await blob.arrayBuffer()));
console.log('Generado', ruta.pathname);
