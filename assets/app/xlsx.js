// Lectura y escritura mínimas de .xlsx sin dependencias (ZIP + XML).
// Lectura: usa DecompressionStream('deflate-raw') del navegador. Escritura: ZIP sin compresión (método «store»).
// shortcut: solo lee la primera hoja y celdas de texto/número; los .xls (formato binario antiguo) no se leen.

const u16 = (v, o) => v.getUint16(o, true);
const u32 = (v, o) => v.getUint32(o, true);

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buffer) {
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('NO_ZIP');
  const count = u16(view, eocd + 10);
  let p = u32(view, eocd + 16);
  const files = {};
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (u32(view, p) !== 0x02014b50) throw new Error('NO_ZIP');
    const method = u16(view, p + 10), size = u32(view, p + 20);
    const nameLen = u16(view, p + 28), extraLen = u16(view, p + 30), commentLen = u16(view, p + 32);
    const local = u32(view, p + 42);
    const name = dec.decode(new Uint8Array(buffer, p + 46, nameLen));
    const dataStart = local + 30 + u16(view, local + 26) + u16(view, local + 28);
    const raw = new Uint8Array(buffer, dataStart, size);
    files[name] = { method, raw };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    async text(name) {
      const f = files[name];
      if (!f) return null;
      const bytes = f.method === 0 ? f.raw : await inflate(f.raw);
      return dec.decode(bytes);
    },
  };
}

const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
const byTag = (node, tag) => Array.from(node.getElementsByTagNameNS('*', tag));

/** Lee la primera hoja: devuelve { hoja, filas: { [numeroFila]: { A: valor, B: valor … } } }. */
export async function leerXlsx(buffer) {
  const head = new Uint8Array(buffer, 0, 4);
  if (head[0] === 0xd0 && head[1] === 0xcf) throw new Error('XLS_ANTIGUO');
  const zip = await unzip(buffer);
  const wb = await zip.text('xl/workbook.xml');
  if (!wb) throw new Error('NO_XLSX');
  const wbDoc = xml(wb);
  const sheet = byTag(wbDoc, 'sheet')[0];
  const rid = sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const rels = xml(await zip.text('xl/_rels/workbook.xml.rels'));
  const target = byTag(rels, 'Relationship').find((r) => r.getAttribute('Id') === rid).getAttribute('Target');
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  const sstText = await zip.text('xl/sharedStrings.xml');
  const sst = sstText ? byTag(xml(sstText), 'si').map((si) => byTag(si, 't').map((t) => t.textContent).join('')) : [];
  const sheetDoc = xml(await zip.text(path));
  const filas = {};
  for (const c of byTag(sheetDoc, 'c')) {
    const ref = c.getAttribute('r');
    const m = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!m) continue;
    const t = c.getAttribute('t');
    const v = byTag(c, 'v')[0]?.textContent;
    let valor;
    if (t === 's') valor = sst[Number(v)];
    else if (t === 'inlineStr') valor = byTag(c, 't').map((x) => x.textContent).join('');
    else if (t === 'str' || t === 'e') valor = v;
    else if (t === 'b') valor = v === '1';
    else valor = v === undefined ? undefined : Number(v);
    if (valor === undefined || valor === '') continue;
    (filas[m[2]] ||= {})[m[1]] = valor;
  }
  return { hoja: sheet.getAttribute('name'), filas };
}

// ---------- Escritura ----------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameB = enc.encode(name), data = enc.encode(content), crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(8, 0, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
    local.setUint16(26, nameB.length, true);
    parts.push(new Uint8Array(local.buffer), nameB, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true);
    cd.setUint32(16, crc, true); cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true);
    cd.setUint16(28, nameB.length, true); cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nameB);
    offset += 30 + nameB.length + data.length;
  }
  const cdSize = central.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const letra = (i) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

/** Crea un .xlsx con una hoja. filas: matriz de valores (las 2 primeras filas van en negrita). */
export function crearXlsx({ hoja = 'Datos', filas, combinadas = [], anchos = {} }) {
  const rowsXml = filas.map((fila, r) => {
    const cells = fila.map((v, c) => {
      if (v === null || v === undefined || v === '') return '';
      const ref = `${letra(c)}${r + 1}`;
      const s = r < 2 ? ' s="1"' : '';
      return typeof v === 'number' ? `<c r="${ref}"${s}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${s}><is><t>${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  const cols = Object.keys(anchos).length ? `<cols>${Object.entries(anchos).map(([col, w]) => { const i = col.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0); return `<col min="${i}" max="${i}" width="${w}" customWidth="1"/>`; }).join('')}</cols>` : '';
  const merges = combinadas.length ? `<mergeCells count="${combinadas.length}">${combinadas.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rowsXml}</sheetData>${merges}</worksheet>`;
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(hoja)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"><alignment wrapText="1" vertical="center"/></xf></cellXfs></styleSheet>'],
    ['xl/worksheets/sheet1.xml', sheetXml],
  ]);
}

/** Encabezado de la plantilla oficial (filas 1 y 2, combinadas como en el original). */
export const ENCABEZADO_PLANTILLA = (() => {
  const f1 = new Array(25).fill(''), f2 = new Array(25).fill('');
  f1[0] = 'Código DANE'; f1[1] = 'Mes periodo gravable'; f1[2] = 'Año periodo gravable';
  f1[3] = 'Gasolina corriente básica'; f1[4] = 'Gasolina corriente oxigenada'; f1[10] = 'Gasolina extra básica ';
  f1[11] = 'Gasolina extra oxigenada'; f1[17] = 'Gasolina importada '; f1[18] = 'Gasolina cte nal básica  z f'; f1[19] = 'Gasolina cte nal oxigena  z f';
  const gal = 'F2. Cantidad de galones', alc = 'F4. % Alcohol carburante';
  [3, 4, 6, 8, 10, 11, 13, 15, 17, 18, 19, 21, 23].forEach((i) => { f2[i] = gal; });
  [5, 7, 9, 12, 14, 16, 20, 22, 24].forEach((i) => { f2[i] = alc; });
  return { filas: [f1, f2], combinadas: ['E1:J1', 'L1:Q1', 'T1:Y1', 'A1:A2', 'B1:B2', 'C1:C2'], anchos: { A: 14, B: 17.5, C: 18.7, D: 32, K: 22.8, R: 22.5, S: 25.5 } };
})();
