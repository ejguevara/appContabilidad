// exportar.js
// Exporta los Reportes Financieros (Balance de Comprobacion, Estado de
// Resultados y Balance General) a PDF (jsPDF + AutoTable) y a Excel
// (SheetJS). Las librerias se cargan desde CDN en index.html y quedan en
// window.jspdf y window.XLSX.
//
// Los numeros salen de las mismas funciones que dibujan la pantalla
// (reportes.js), asi lo exportado siempre coincide con lo que se ve.

import { calcularBalanceComprobacion, calcularEstadoResultados, calcularBalanceGeneral } from './reportes.js';
import { formatMoney, toast, icono } from './utils.js';

const NOMBRE_SISTEMA = 'App Contable — Sistema Contable y Fiscal (El Salvador)';
const FORMATO_MONEDA_XLSX = '"$"#,##0.00;[Red]-"$"#,##0.00';

// -----------------------------------------------------------------------
// Datos de cada reporte en forma de filas, comunes a PDF y Excel.
// Cada fila de los reportes "de dos columnas" es { concepto, monto, estilo }
// donde estilo es 'seccion' (titulo sin monto), 'detalle' o 'total'.
// -----------------------------------------------------------------------

function filasEstadoResultados() {
  const r = calcularEstadoResultados();
  const detalle = (c) => ({ concepto: `    ${c.nombre}`, monto: Math.abs(c.saldo), estilo: 'detalle' });
  return [
    { concepto: 'Ingresos (codigo 5)', monto: r.totalVentas, estilo: 'total' },
    { concepto: 'Costo de Ventas', estilo: 'seccion' },
    ...r.costoVentasDetalle.map(detalle),
    { concepto: 'Utilidad Bruta en Ventas', monto: r.utilidadBruta, estilo: 'total' },
    { concepto: 'Gastos de Operacion', estilo: 'seccion' },
    ...r.gastosDetalle.map(detalle),
    { concepto: 'Total Costos y Gastos (codigo 4)', monto: r.totalCostosYGastos, estilo: 'total' },
    { concepto: 'Utilidad Antes de Impuestos (Ingresos - Costos y Gastos)', monto: r.utilidadAntesImpuestos, estilo: 'total' },
  ];
}

function filasBalanceGeneral() {
  const b = calcularBalanceGeneral();
  const detalle = (c) => ({ concepto: `    ${c.codigo} - ${c.nombre}`, monto: c.saldo, estilo: 'detalle' });
  return {
    cuadra: b.cuadra,
    filas: [
      { concepto: 'ACTIVO (codigo 1)', estilo: 'seccion' },
      ...b.activos.map(detalle),
      { concepto: 'Total Activo', monto: b.totalActivo, estilo: 'total' },
      { concepto: 'PASIVO (codigo 2)', estilo: 'seccion' },
      ...b.pasivos.map(detalle),
      { concepto: 'Total Pasivo', monto: b.totalPasivo, estilo: 'total' },
      { concepto: 'PATRIMONIO (codigo 3)', estilo: 'seccion' },
      ...b.patrimonios.map(detalle),
      { concepto: '    Utilidad del ejercicio', monto: b.utilidadAntesImpuestos, estilo: 'detalle' },
      { concepto: 'Total Patrimonio', monto: b.totalPatrimonio, estilo: 'total' },
      { concepto: 'Total Pasivo + Patrimonio', monto: b.totalPasivoPatrimonio, estilo: 'total' },
    ],
  };
}

const REPORTES = {
  comprobacion: { titulo: 'Balance de Comprobacion', archivo: 'Balance_de_Comprobacion' },
  resultados: { titulo: 'Estado de Resultados', archivo: 'Estado_de_Resultados' },
  general: { titulo: 'Balance General', archivo: 'Balance_General' },
};

function fechaArchivo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fechaLegible() {
  return new Date().toLocaleString('es-SV', { dateStyle: 'long', timeStyle: 'short' });
}

// -----------------------------------------------------------------------
// PDF
// -----------------------------------------------------------------------

const COLOR_ENCABEZADO = [79, 70, 229]; // indigo-600, igual que la app
const COLOR_TEXTO_SUAVE = [100, 116, 139]; // slate-500

function encabezadoPdf(doc, titulo) {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXTO_SUAVE);
  doc.text(NOMBRE_SISTEMA, 14, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(titulo, 14, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXTO_SUAVE);
  doc.text(`Generado el ${fechaLegible()} · Cifras en dolares (USD)`, 14, 29);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 32, ancho - 14, 32);
  return 37; // y donde empieza el contenido
}

function notaPdf(doc, texto, ok) {
  const y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...(ok ? [4, 120, 87] : [190, 18, 60]));
  doc.text(texto, 14, y);
}

function pdfBalanceComprobacion(doc) {
  const bc = calcularBalanceComprobacion();
  const startY = encabezadoPdf(doc, REPORTES.comprobacion.titulo);
  const vacio = (n) => (n ? formatMoney(n) : '');
  doc.autoTable({
    startY,
    head: [['Codigo', 'Cuenta', 'Suma Debe', 'Suma Haber', 'Saldo Deudor', 'Saldo Acreedor']],
    body: bc.filas.map((f) => [f.codigo, f.nombre, formatMoney(f.sumaDebe), formatMoney(f.sumaHaber), vacio(f.saldoDeudor), vacio(f.saldoAcreedor)]),
    foot: [['', 'Totales', formatMoney(bc.totalDebe), formatMoney(bc.totalHaber), formatMoney(bc.totalSaldoDeudor), formatMoney(bc.totalSaldoAcreedor)]],
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { fillColor: COLOR_ENCABEZADO },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 16 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    didParseCell: (d) => {
      if ((d.section === 'head' || d.section === 'foot') && d.column.index >= 2) d.cell.styles.halign = 'right';
    },
  });
  const ok = bc.cuadraMovimientos && bc.cuadraSaldos;
  notaPdf(
    doc,
    `Movimientos ${bc.cuadraMovimientos ? 'cuadrados' : 'NO cuadran'} · Saldos ${bc.cuadraSaldos ? 'cuadrados' : 'NO cuadran'}`,
    ok
  );
}

function pdfDosColumnas(doc, titulo, filas) {
  const startY = encabezadoPdf(doc, titulo);
  doc.autoTable({
    startY,
    head: [['Concepto', 'Monto']],
    body: filas.map((f) => [f.concepto, f.monto === undefined ? '' : formatMoney(f.monto)]),
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.8 },
    headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 255 },
    columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
    didParseCell: (d) => {
      if (d.section === 'head' && d.column.index === 1) d.cell.styles.halign = 'right';
      if (d.section !== 'body') return;
      const estilo = filas[d.row.index].estilo;
      if (estilo === 'seccion') {
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.textColor = COLOR_TEXTO_SUAVE;
      } else if (estilo === 'total') {
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });
}

function pdfEstadoResultados(doc) {
  pdfDosColumnas(doc, REPORTES.resultados.titulo, filasEstadoResultados());
}

function pdfBalanceGeneral(doc) {
  const { filas, cuadra } = filasBalanceGeneral();
  pdfDosColumnas(doc, REPORTES.general.titulo, filas);
  notaPdf(doc, `Ecuacion contable (Activo = Pasivo + Patrimonio): ${cuadra ? 'Cuadrada' : 'NO cuadrada'}`, cuadra);
}

const GENERADORES_PDF = {
  comprobacion: pdfBalanceComprobacion,
  resultados: pdfEstadoResultados,
  general: pdfBalanceGeneral,
};

function numerarPaginas(doc) {
  const total = doc.getNumberOfPages();
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXTO_SUAVE);
    doc.text(`Pagina ${i} de ${total}`, ancho - 14, alto - 8, { align: 'right' });
  }
}

function exportarPdf(claves, nombreArchivo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  claves.forEach((clave, i) => {
    if (i > 0) doc.addPage();
    GENERADORES_PDF[clave](doc);
  });
  numerarPaginas(doc);
  doc.save(`${nombreArchivo}_${fechaArchivo()}.pdf`);
}

// -----------------------------------------------------------------------
// Excel
// -----------------------------------------------------------------------

/** Crea una hoja con encabezado; las celdas numericas quedan como numero con formato de moneda. */
function hojaExcel(titulo, encabezados, filas, anchos) {
  const XLSX = window.XLSX;
  const aoa = [[NOMBRE_SISTEMA], [titulo], [`Generado el ${fechaLegible()}`], [], encabezados, ...filas];
  const hoja = XLSX.utils.aoa_to_sheet(aoa);
  for (const ref of Object.keys(hoja)) {
    if (ref[0] !== '!' && hoja[ref].t === 'n') hoja[ref].z = FORMATO_MONEDA_XLSX;
  }
  hoja['!cols'] = anchos.map((wch) => ({ wch }));
  return hoja;
}

function excelBalanceComprobacion() {
  const bc = calcularBalanceComprobacion();
  const vacio = (n) => (n ? n : '');
  const filas = bc.filas.map((f) => [f.codigo, f.nombre, f.sumaDebe, f.sumaHaber, vacio(f.saldoDeudor), vacio(f.saldoAcreedor)]);
  filas.push(['', 'Totales', bc.totalDebe, bc.totalHaber, bc.totalSaldoDeudor, bc.totalSaldoAcreedor]);
  filas.push([]);
  filas.push(['', `Movimientos ${bc.cuadraMovimientos ? 'cuadrados' : 'NO cuadran'} · Saldos ${bc.cuadraSaldos ? 'cuadrados' : 'NO cuadran'}`]);
  return hojaExcel(
    REPORTES.comprobacion.titulo,
    ['Codigo', 'Cuenta', 'Suma Debe', 'Suma Haber', 'Saldo Deudor', 'Saldo Acreedor'],
    filas,
    [10, 32, 16, 16, 16, 16]
  );
}

const filaDosColumnas = (f) => [f.estilo === 'seccion' ? f.concepto.toUpperCase() : f.concepto, f.monto === undefined ? '' : f.monto];

function excelEstadoResultados() {
  return hojaExcel(REPORTES.resultados.titulo, ['Concepto', 'Monto'], filasEstadoResultados().map(filaDosColumnas), [58, 18]);
}

function excelBalanceGeneral() {
  const { filas, cuadra } = filasBalanceGeneral();
  const aoa = filas.map(filaDosColumnas);
  aoa.push([], [`Ecuacion contable (Activo = Pasivo + Patrimonio): ${cuadra ? 'Cuadrada' : 'NO cuadrada'}`]);
  return hojaExcel(REPORTES.general.titulo, ['Concepto', 'Monto'], aoa, [58, 18]);
}

const GENERADORES_EXCEL = {
  comprobacion: excelBalanceComprobacion,
  resultados: excelEstadoResultados,
  general: excelBalanceGeneral,
};

function exportarExcel(claves, nombreArchivo) {
  const XLSX = window.XLSX;
  const libro = XLSX.utils.book_new();
  for (const clave of claves) {
    // Excel limita el nombre de la hoja a 31 caracteres.
    XLSX.utils.book_append_sheet(libro, GENERADORES_EXCEL[clave](), REPORTES[clave].titulo.slice(0, 31));
  }
  XLSX.writeFile(libro, `${nombreArchivo}_${fechaArchivo()}.xlsx`);
}

// -----------------------------------------------------------------------
// Botones
// -----------------------------------------------------------------------

/**
 * Engancha los botones con atributo data-exportar="comprobacion|resultados|general|todos"
 * y data-formato="pdf|excel".
 */
export function initExportar() {
  document.querySelectorAll('[data-exportar]').forEach((btn) => {
    btn.insertAdjacentHTML('afterbegin', icono('descargar', 'w-3.5 h-3.5'));
    btn.addEventListener('click', () => {
      const reporte = btn.dataset.exportar;
      const formato = btn.dataset.formato;
      const claves = reporte === 'todos' ? Object.keys(REPORTES) : [reporte];
      const nombre = reporte === 'todos' ? 'Reportes_Financieros' : REPORTES[reporte].archivo;

      const libreriaLista = formato === 'pdf' ? window.jspdf && window.jspdf.jsPDF : window.XLSX;
      if (!libreriaLista) {
        toast('No se pudo cargar la libreria de exportacion. Revisa tu conexion a internet y recarga la pagina.', 'error');
        return;
      }

      try {
        if (formato === 'pdf') exportarPdf(claves, nombre);
        else exportarExcel(claves, nombre);
        toast(`${formato === 'pdf' ? 'PDF' : 'Excel'} descargado.`, 'exito');
      } catch (err) {
        console.error(err);
        toast('Ocurrio un error al generar el archivo.', 'error');
      }
    });
  });
}
