// dashboard.js
// Modulo: Dashboard con KPIs y graficos interactivos (Chart.js).

import { getCuentasCache } from './cuentas.js';
import { obtenerTodosLosMovimientosActivos } from './db.js';
import { calcularEstadoResultados } from './reportes.js';
import { formatMoney, agruparPorMes } from './utils.js';

let chartVentasCosto = null;
let chartGastos = null;
let chartActivo = null;

export function initDashboard() {
  document.addEventListener('cuentas:actualizadas', () => {
    renderKPIs();
    renderDonaGastos();
    renderDonaActivo();
  });
  document.getElementById('btn-refrescar-dashboard').addEventListener('click', renderGraficoVentasCosto);

  renderKPIs();
  renderGraficoVentasCosto();
  renderDonaGastos();
  renderDonaActivo();
}

function buscarPorNombre(cuentas, palabras) {
  const lower = (s) => s.toLowerCase();
  return cuentas.filter((c) => palabras.some((p) => lower(c.nombre).includes(p)));
}

function renderKPIs() {
  const cuentas = getCuentasCache();
  const { utilidadAntesImpuestos } = calcularEstadoResultados();

  const efectivo = buscarPorNombre(cuentas, ['caja', 'banco']).reduce((s, c) => s + c.saldo, 0);

  const debito = buscarPorNombre(cuentas, ['iva debito', 'débito fiscal', 'debito fiscal']);
  const credito = buscarPorNombre(cuentas, ['iva credito', 'crédito fiscal', 'credito fiscal']);
  const saldoDebito = debito.reduce((s, c) => s + Math.abs(c.saldo), 0);
  const saldoCredito = credito.reduce((s, c) => s + Math.abs(c.saldo), 0);
  const diferenciaIVA = saldoDebito - saldoCredito;

  document.getElementById('kpi-utilidad').textContent = formatMoney(utilidadAntesImpuestos);
  document.getElementById('kpi-utilidad').className = `text-2xl font-bold ${utilidadAntesImpuestos >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;

  document.getElementById('kpi-efectivo').textContent = formatMoney(efectivo);

  const kpiIvaLabel = document.getElementById('kpi-iva-label');
  const kpiIva = document.getElementById('kpi-iva');
  if (diferenciaIVA > 0) {
    kpiIvaLabel.textContent = 'IVA por Pagar';
    kpiIva.className = 'text-2xl font-bold text-rose-600';
  } else {
    kpiIvaLabel.textContent = 'IVA Saldo a Favor';
    kpiIva.className = 'text-2xl font-bold text-emerald-600';
  }
  kpiIva.textContent = formatMoney(Math.abs(diferenciaIVA));
}

async function renderGraficoVentasCosto() {
  const cuentas = getCuentasCache();
  const ventasCuentas = buscarPorNombre(cuentas, ['venta']).filter((c) => c.tipo === 'ingreso');
  const costoCuentas = buscarPorNombre(cuentas, ['compra', 'costo de venta']).filter((c) => c.tipo === 'egreso');

  const movimientos = await obtenerTodosLosMovimientosActivos();
  const idsVentas = new Set(ventasCuentas.map((c) => c.id));
  const idsCosto = new Set(costoCuentas.map((c) => c.id));

  const movVentas = movimientos.filter((m) => idsVentas.has(m.cuentaId));
  const movCosto = movimientos.filter((m) => idsCosto.has(m.cuentaId));

  const ventasPorMes = agruparPorMes(movVentas, 'fecha', (m) => m.haber - m.debe);
  const costoPorMes = agruparPorMes(movCosto, 'fecha', (m) => m.debe - m.haber);

  const meses = [...new Set([...ventasPorMes.map((x) => x[0]), ...costoPorMes.map((x) => x[0])])].sort();
  const mapVentas = new Map(ventasPorMes);
  const mapCosto = new Map(costoPorMes);

  const dataVentas = meses.map((m) => mapVentas.get(m) || 0);
  const dataCosto = meses.map((m) => mapCosto.get(m) || 0);
  const dataUtilidad = meses.map((m, i) => dataVentas[i] - dataCosto[i]);

  const ctx = document.getElementById('chart-ventas-costo');
  if (chartVentasCosto) chartVentasCosto.destroy();
  // eslint-disable-next-line no-undef
  chartVentasCosto = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses.length ? meses : ['Sin datos'],
      datasets: [
        {
          type: 'bar',
          label: 'Ventas',
          data: dataVentas,
          backgroundColor: '#6366f1',
          borderRadius: 6,
        },
        {
          type: 'bar',
          label: 'Costo de Ventas',
          data: dataCosto,
          backgroundColor: '#f59e0b',
          borderRadius: 6,
        },
        {
          type: 'line',
          label: 'Utilidad Bruta',
          data: dataUtilidad,
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          tension: 0.3,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: {
          ticks: { callback: (v) => formatMoney(v) },
        },
      },
    },
  });
}

function paletaColores(n) {
  const base = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#a855f7', '#f97316', '#14b8a6'];
  return Array.from({ length: n }, (_, i) => base[i % base.length]);
}

function renderDonaGastos() {
  const cuentas = getCuentasCache();
  const gastos = cuentas.filter(
    (c) => c.tipo === 'egreso' && !buscarPorNombre([c], ['compra', 'costo de venta']).length && c.saldo !== 0
  );

  const ctx = document.getElementById('chart-gastos');
  if (chartGastos) chartGastos.destroy();
  // eslint-disable-next-line no-undef
  chartGastos = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: gastos.length ? gastos.map((c) => c.nombre) : ['Sin gastos registrados'],
      datasets: [
        {
          data: gastos.length ? gastos.map((c) => Math.abs(c.saldo)) : [1],
          backgroundColor: gastos.length ? paletaColores(gastos.length) : ['#e2e8f0'],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

function renderDonaActivo() {
  const cuentas = getCuentasCache();
  const activos = cuentas.filter((c) => c.tipo === 'activo' && c.saldo !== 0);

  const ctx = document.getElementById('chart-activo');
  if (chartActivo) chartActivo.destroy();
  // eslint-disable-next-line no-undef
  chartActivo = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: activos.length ? activos.map((c) => c.nombre) : ['Sin activos registrados'],
      datasets: [
        {
          data: activos.length ? activos.map((c) => Math.abs(c.saldo)) : [1],
          backgroundColor: activos.length ? paletaColores(activos.length) : ['#e2e8f0'],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
    },
  });
}
