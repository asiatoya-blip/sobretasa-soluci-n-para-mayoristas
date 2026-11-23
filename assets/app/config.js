// Configuración del prototipo. TODOS los valores son simulados (aproximados a la norma) y en la plataforma
// real vienen de la consola administrativa o de la API de cada entidad.

export const EMPRESA = {
  razonSocial: 'Distribuidora Andina de Combustibles S.A.S.',
  nit: '900.123.456-7',
  calidad: 'Distribuidor mayorista',
};

// Ley 788 de 2002 (art. 55): sobretasa municipal/distrital 18,5 % y departamental 6,5 % (Bogotá D.C. 25 %).
// Base gravable: precio de referencia por galón (simulado) × galones; el alcohol carburante no es gravado.
// Sanción por extemporaneidad (simulada, art. 641 E.T.): 5 % del impuesto por mes o fracción, mínimo 10 UVT.
export const PARAMS = {
  uvt: 52374, // UVT 2026 simulada
  sancionPorMes: 0.05,
  sancionMinimaUvt: 10,
  tasaMoraAnual: 0.25, // intereses de mora simulados (simples)
  redondeo: 1000, // los valores de la declaración se redondean al múltiplo de mil más cercano
  minFilas: 2,
  maxFilas: 50,
  alcoholHabitualMin: 8,
  alcoholHabitualMax: 12,
};

export const PRECIOS_REFERENCIA = {
  corriente: { nombre: 'Gasolina corriente', valor: 9512 },
  extra: { nombre: 'Gasolina extra', valor: 11874 },
  corrienteZF: { nombre: 'Gasolina corriente en zona de frontera', valor: 7350 },
};

// Columnas de la plantilla (hoja "Datos"): A Código DANE · B Mes · C Año · D–Y productos (F2 galones / F4 % alcohol).
export const PRODUCTOS = [
  { id: 'cte', nombre: 'Gasolina corriente básica', ref: 'corriente', mezclas: [{ gal: 'D' }] },
  { id: 'cteOx', nombre: 'Gasolina corriente oxigenada', ref: 'corriente', mezclas: [{ gal: 'E', alc: 'F' }, { gal: 'G', alc: 'H' }, { gal: 'I', alc: 'J' }] },
  { id: 'ext', nombre: 'Gasolina extra básica', ref: 'extra', mezclas: [{ gal: 'K' }] },
  { id: 'extOx', nombre: 'Gasolina extra oxigenada', ref: 'extra', mezclas: [{ gal: 'L', alc: 'M' }, { gal: 'N', alc: 'O' }, { gal: 'P', alc: 'Q' }] },
  { id: 'imp', nombre: 'Gasolina importada', ref: 'corriente', mezclas: [{ gal: 'R' }] },
  { id: 'zf', nombre: 'Gasolina corriente nacional básica (zona de frontera)', ref: 'corrienteZF', mezclas: [{ gal: 'S' }] },
  { id: 'zfOx', nombre: 'Gasolina corriente nacional oxigenada (zona de frontera)', ref: 'corrienteZF', mezclas: [{ gal: 'T', alc: 'U' }, { gal: 'V', alc: 'W' }, { gal: 'X', alc: 'Y' }] },
];

// Entidades inscritas y habilitadas (simuladas). diaLimite: día del mes siguiente al periodo en que vence la presentación.
const alcaldia = (dane, municipio, depto, extra = {}) => ({ dane, nombre: `Alcaldía de ${municipio}`, depto, tipo: 'Alcaldía', tarifa: 18.5, diaLimite: 8, exigeRevisor: false, ...extra });
const gobernacion = (dane, depto, extra = {}) => ({ dane, nombre: `Gobernación de ${depto}`, depto, tipo: 'Gobernación', tarifa: 6.5, diaLimite: 15, exigeRevisor: true, ...extra });

export const ENTIDADES = [
  { dane: '11001', nombre: 'Alcaldía Mayor de Bogotá D.C.', depto: 'Bogotá D.C.', tipo: 'Distrito', tarifa: 25, diaLimite: 8, exigeRevisor: true },
  alcaldia('25035', 'Anapoima', 'Cundinamarca'),
  alcaldia('25175', 'Chía', 'Cundinamarca', { exigeRevisor: true }),
  alcaldia('25214', 'Cota', 'Cundinamarca'),
  alcaldia('25269', 'Facatativá', 'Cundinamarca'),
  alcaldia('25286', 'Funza', 'Cundinamarca'),
  alcaldia('25290', 'Fusagasugá', 'Cundinamarca'),
  alcaldia('25307', 'Girardot', 'Cundinamarca'),
  alcaldia('25430', 'Madrid', 'Cundinamarca'),
  alcaldia('25473', 'Mosquera', 'Cundinamarca'),
  alcaldia('25754', 'Soacha', 'Cundinamarca', { exigeRevisor: true }),
  alcaldia('25817', 'Tocancipá', 'Cundinamarca'),
  alcaldia('25899', 'Zipaquirá', 'Cundinamarca'),
  alcaldia('15001', 'Tunja', 'Boyacá', { exigeRevisor: true }),
  alcaldia('15238', 'Duitama', 'Boyacá'),
  alcaldia('15759', 'Sogamoso', 'Boyacá'),
  alcaldia('50001', 'Villavicencio', 'Meta', { exigeRevisor: true }),
  alcaldia('85001', 'Yopal', 'Casanare'),
  alcaldia('85410', 'Tauramena', 'Casanare'),
  gobernacion('25', 'Cundinamarca'),
  gobernacion('15', 'Boyacá'),
  gobernacion('50', 'Meta'),
  gobernacion('52', 'Nariño'),
  gobernacion('85', 'Casanare'),
];

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const ROLES_FIRMANTE = ['Declarante principal', 'Revisor fiscal', 'Contador'];

export const BANCOS_PSE = ['Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia', 'Banco de Occidente', 'Banco Popular', 'Banco AV Villas', 'Scotiabank Colpatria'];
