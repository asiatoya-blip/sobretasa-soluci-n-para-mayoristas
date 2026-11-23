# Declaraciones masivas de sobretasa · Prototipo navegable

Prototipo funcional para probar con usuarios la solución de **carga masiva de declaraciones de sobretasa a la gasolina**
para distribuidores mayoristas: cargar un archivo con varias entidades, revisar, generar, firmar por grupos y pagar cada
declaración.

> Todo es simulado: entidades, tarifas, cálculos, firmas y pagos. No se envían correos ni se mueve dinero.
> Los datos se guardan en el `localStorage` del navegador.

## Probarlo en local

No necesita instalación ni compilación (HTML + JS con módulos ES y la librería `nxgov`). Sirve la carpeta con cualquier
servidor estático:

```powershell
python -m http.server 8080
```

y abre <http://localhost:8080>. Abrir `index.html` con doble clic no funciona: los módulos ES necesitan un servidor.

Pruebas de la lógica de cálculo y validación (Node 20 o superior):

```powershell
npm test
```

## Flujo de prueba de principio a fin

1. **Nueva carga masiva** → «Descargar ejemplo diligenciado» (se genera para el periodo vigente según la fecha real).
   También hay una copia en [`plantillas/`](plantillas/).
2. Carga el archivo y pulsa **Revisar archivo**: 12 filas válidas, 1 advertencia (alcohol de 6 %) y 3 errores
   (entidad no habilitada, entidad repetida en el archivo y periodo en curso).
3. **Generar 12 declaraciones**: vuelven al tablero en borrador, en el grupo de firma de la carga.
4. En el **grupo de firma**, define el declarante principal y el revisor fiscal, y usa «Copiar a todo el grupo».
5. **Firmar declaraciones** → «Simular firma de los firmantes».
6. En el tablero, **Pagar** cada declaración: banco → pasarela PSE simulada → aprobar o rechazar.
7. **Comprobante**: «Descargar» abre la impresión del navegador (guardar como PDF).

El tablero también permite seleccionar borradores para **crear un grupo** o **agregarlos a un grupo existente**.
La demo arranca sin datos. «Reiniciar datos» (franja superior o «Configuración») borra todo y vuelve a empezar de cero.

## Reglas simuladas

| Regla | Valor en la demo |
|---|---|
| Periodo vigente | Mes anterior a la fecha real |
| Fecha límite | Día 8 del mes siguiente (alcaldías) · día 15 (gobernaciones) |
| Tarifas (Ley 788 de 2002) | Municipal 18,5 % · departamental 6,5 % · Bogotá D. C. 25 % |
| Base gravable | Galones sin el % de alcohol carburante × precio de referencia simulado |
| Sanción por extemporaneidad | 5 % por mes o fracción, tope 100 % del impuesto, mínimo 10 UVT |
| Intereses de mora | 25 % anual simple |
| Redondeo | Al múltiplo de $ 1.000 más cercano |
| Filas por carga | 2 a 50 |

Los parámetros están en [`assets/app/config.js`](assets/app/config.js). En la plataforma real los define cada entidad
en la consola administrativa.

## Estructura

```
index.html               Página única (cabecera GOV.CO, logo Sogas, pie)
assets/app/              Aplicación
  main.js                Enrutador por hash
  config.js              Empresa, entidades, tarifas y parámetros simulados
  calc.js · validate.js  Liquidación y validación del archivo (funciones puras)
  xlsx.js                Lectura y escritura de .xlsx sin dependencias
  store.js               Estado de la demo (localStorage, arranca vacío)
  views/                 Tablero, carga, grupo de firma, detalle, pago y ayuda
  app.css                Maquetación con los tokens de nxgov
assets/nxgov/            Copia de la librería nxgov (componentes GOV.CO v5)
plantillas/              Plantilla oficial y ejemplo diligenciado
tests/                   Pruebas con node:test
tools/generar-ejemplo.js Regenera el ejemplo estático: node tools/generar-ejemplo.js 2026-11-23
```

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub.
2. *Settings → Pages → Build and deployment*: «Deploy from a branch», rama `main`, carpeta `/ (root)`.
3. El sitio queda en `https://<organización>.github.io/<repositorio>/`. Todas las rutas son relativas y `.nojekyll`
   evita el procesamiento de Jekyll.

## Accesibilidad y normativa

GOV.CO v5 (barra superior, barra de accesibilidad y pie del CDN oficial), WCAG 2.1 AA, Nunito Sans, formatos es-CO.
Los estados se muestran siempre con texto, los errores de formulario van en línea y los avisos se anuncian a los
lectores de pantalla.
