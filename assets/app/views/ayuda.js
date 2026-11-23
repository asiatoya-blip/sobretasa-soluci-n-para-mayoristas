// Tutorial (guía de prueba de punta a punta) y manual de uso (reglas del prototipo).
import { PARAMS } from '../config.js';
import { num, pesos, linkBtn, breadcrumb, aviso } from '../ui.js';

const TUTORIAL = [
  ['Descarga el ejemplo', 'En «Nueva carga masiva», pulsa «Descargar ejemplo diligenciado». El archivo trae 12 filas válidas del periodo vigente y 3 con error a propósito.'],
  ['Carga el archivo', 'Arrástralo o selecciónalo en «Cargar archivo» y pulsa «Revisar archivo».'],
  ['Revisa y genera', 'Mira las observaciones (entidad no habilitada, duplicado y periodo no vigente), abre «Ver cálculo» de alguna fila y pulsa «Generar declaraciones». Las filas con error no se generan.'],
  ['Arma el grupo de firma', 'La carga crea su grupo. Desde el tablero también puedes seleccionar borradores con las casillas y crear un grupo o agregarlos a uno existente.'],
  ['Define los firmantes', 'En el grupo, llena el declarante principal y, si la entidad lo exige, el revisor fiscal o contador. «Copiar a todo el grupo» repite los firmantes en todas las declaraciones.'],
  ['Envía a firma', 'Pulsa «Firmar declaraciones». Después, con «Simular firma de los firmantes» simulas que todos firmaron desde su correo.'],
  ['Paga cada declaración', 'En el tablero, cada declaración firmada tiene «Pagar». Elige un banco, pasa a la pasarela simulada y aprueba o rechaza el pago.'],
  ['Descarga el comprobante', 'Al aprobar, se muestra el comprobante y la declaración queda «Pagada». «Descargar» abre la impresión del navegador (guardar como PDF).'],
];

export function vistaAyuda(tipo) {
  const tutorial = tipo === 'tutorial';
  const html = tutorial
    ? `<ol class="app-pasos">${TUTORIAL.map(([t, d]) => `<li><h2 class="app-h3">${t}</h2><p>${d}</p></li>`).join('')}</ol>
       ${aviso('info', 'Para empezar de nuevo', 'En «Configuración» puedes reiniciar los datos de la demostración. Los datos se guardan solo en este navegador.')}`
    : `<section class="app-card"><h2 class="app-h3">Archivo</h2><ul class="app-lista-simple">
         <li>Usa la plantilla oficial (.xlsx, máximo 5 MB), sin cambiar columnas ni encabezados. Los datos empiezan en la fila 3.</li>
         <li>Cada carga tiene de ${PARAMS.minFilas} a ${PARAMS.maxFilas} declaraciones: una fila por entidad y periodo.</li>
         <li>Solo se aceptan entidades habilitadas (pestaña «Entidades disponibles») y periodos hasta el vigente.</li>
         <li>Las mezclas con alcohol carburante requieren el porcentaje; lo habitual es entre ${PARAMS.alcoholHabitualMin} % y ${PARAMS.alcoholHabitualMax} %.</li></ul></section>
       <section class="app-card"><h2 class="app-h3">Cálculo (simulado)</h2><ul class="app-lista-simple">
         <li>Base gravable = galones sin la parte de alcohol × precio de referencia del producto.</li>
         <li>Tarifas (Ley 788 de 2002): municipal 18,5 %, departamental 6,5 %, Bogotá D. C. 25 %.</li>
         <li>Fecha límite: día 8 del mes siguiente en alcaldías y día 15 en gobernaciones.</li>
         <li>Extemporánea: sanción del ${num(PARAMS.sancionPorMes * 100)} % por mes o fracción (mínimo ${PARAMS.sancionMinimaUvt} UVT = ${pesos(PARAMS.sancionMinimaUvt * PARAMS.uvt)}) e intereses de mora del ${num(PARAMS.tasaMoraAnual * 100)} % anual. Cada entidad define sus valores en la consola administrativa.</li></ul></section>
       <section class="app-card"><h2 class="app-h3">Estados</h2><ul class="app-lista-simple">
         <li><strong>Borrador:</strong> generada; se puede quitar o mover de grupo y eliminar.</li>
         <li><strong>Pendiente de firma:</strong> su grupo se envió a firma; no se puede cambiar.</li>
         <li><strong>Firmada:</strong> lista para pagar una por una.</li>
         <li><strong>Pagada:</strong> tiene comprobante.</li></ul></section>`;
  return {
    titulo: tutorial ? 'Tutorial' : 'Manual de uso',
    html: `${breadcrumb([{ label: 'Inicio', href: '#/' }, { label: tutorial ? 'Tutorial' : 'Manual de uso' }])}
      <div class="app-pagehead"><div><h1 class="app-title" tabindex="-1">${tutorial ? 'Tutorial: prueba el flujo completo' : 'Manual de uso'}</h1>
      <p class="app-lead">${tutorial ? 'Ocho pasos para probar el prototipo de principio a fin con datos simulados.' : 'Reglas del archivo, del cálculo y de los estados en este prototipo.'}</p></div></div>
      ${html}
      <div class="app-acciones">${linkBtn('Volver al tablero', '#/', { iconName: 'arrow-left' })}${tutorial ? linkBtn('Empezar una carga', '#/carga', { variant: 'primary', iconName: 'upload' }) : ''}</div>`,
  };
}
