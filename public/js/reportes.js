// reportes.js
// Modulo: Reportes Financieros - Balance de Comprobacion, Estado de
// Resultados (metodo analitico) y Balance General.

import { getCuentasCache } from './cuentas.js';
import { formatMoney, naturalezaCuenta, round2, toast } from './utils.js';

export function initReportes() {
  document.addEventListener('cuentas:actualizadas', () => {
    renderBalanceComprobacion();
    renderBalanceGeneral();
  });

  document.getElementById('btn-generar-estado-resultados').addEventListener('click', renderEstadoResultados);

  renderBalanceComprobacion();
  renderBalanceGeneral();
}

// -----------------------------------------------------------------------
// Balance de Comprobacion
// -----------------------------------------------------------------------

function renderBalanceComprobacion() {
  const cuentas = getCuentasCache();
  const cont = document.getElementById('tabla-balance-comprobacion');

  let totalDebe = 0;
  let totalHaber = 0;
  let totalSaldoDeudor = 0;
  let totalSaldoAcreedor = 0;

  const filas = cuentas
    .slice()
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .map((c) => {
      const naturaleza = naturalezaCuenta(c.tipo);
      const saldoDeudor = naturaleza === 'deudora' && c.saldo > 0 ? c.saldo : naturaleza === 'acreedora' && c.saldo < 0 ? Math.abs(c.saldo) : 0;
      const saldoAcreedor = naturaleza === 'acreedora' && c.saldo > 0 ? c.saldo : naturaleza === 'deudora' && c.saldo < 0 ? Math.abs(c.saldo) : 0;

      totalDebe += c.sumaDebe || 0;
      totalHaber += c.sumaHaber || 0;
      totalSaldoDeudor += saldoDeudor;
      totalSaldoAcreedor += saldoAcreedor;

      return `
        <tr class="border-b border-slate-100">
          <td class="px-3 py-2 text-xs font-mono text-slate-400">${c.codigo}</td>
          <td class="px-3 py-2 text-sm">${c.nombre}</td>
          <td class="px-3 py-2 text-sm text-right font-mono">${formatMoney(c.sumaDebe || 0)}</td>
          <td class="px-3 py-2 text-sm text-right font-mono">${formatMoney(c.sumaHaber || 0)}</td>
          <td class="px-3 py-2 text-sm text-right font-mono">${saldoDeudor ? formatMoney(saldoDeudor) : ''}</td>
          <td class="px-3 py-2 text-sm text-right font-mono">${saldoAcreedor ? formatMoney(saldoAcreedor) : ''}</td>
        </tr>`;
    })
    .join('');

  totalDebe = round2(totalDebe);
  totalHaber = round2(totalHaber);
  totalSaldoDeudor = round2(totalSaldoDeudor);
  totalSaldoAcreedor = round2(totalSaldoAcreedor);
  const cuadraMovimientos = totalDebe === totalHaber;
  const cuadraSaldos = totalSaldoDeudor === totalSaldoAcreedor;

  cont.innerHTML = `
    <table class="min-w-full">
      <thead class="bg-slate-50">
        <tr>
          <th class="px-3 py-2 text-left text-xs font-semibold text-slate-500">Codigo</th>
          <th class="px-3 py-2 text-left text-xs font-semibold text-slate-500">Cuenta</th>
          <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Suma Debe</th>
          <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Suma Haber</th>
          <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Saldo Deudor</th>
          <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Saldo Acreedor</th>
        </tr>
      </thead>
      <tbody>
        ${filas || '<tr><td colspan="6" class="px-3 py-6 text-center text-sm text-slate-400">No hay cuentas registradas.</td></tr>'}
      </tbody>
      <tfoot class="bg-slate-50 font-semibold">
        <tr>
          <td class="px-3 py-2 text-sm" colspan="2">Totales</td>
          <td class="px-3 py-2 text-sm text-right font-mono">${formatMoney(totalDebe)}</td>
          <td class="px-3 py-2 text-sm text-right font-mono">${formatMoney(totalHaber)}</td>
          <td class="px-3 py-2 text-sm text-right font-mono">${formatMoney(totalSaldoDeudor)}</td>
          <td class="px-3 py-2 text-sm text-right font-mono">${formatMoney(totalSaldoAcreedor)}</td>
        </tr>
      </tfoot>
    </table>
    <div class="mt-3 flex flex-wrap gap-2">
      <span class="text-xs font-semibold px-2 py-1 rounded-full ${cuadraMovimientos ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
        Movimientos ${cuadraMovimientos ? 'cuadrados ✓' : 'NO cuadran ✕'}
      </span>
      <span class="text-xs font-semibold px-2 py-1 rounded-full ${cuadraSaldos ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
        Saldos ${cuadraSaldos ? 'cuadrados ✓' : 'NO cuadran ✕'}
      </span>
    </div>
  `;
}

// -----------------------------------------------------------------------
// Estado de Resultados (metodo analitico / ajustado en la cuenta Compras)
// -----------------------------------------------------------------------

function buscarCuentaPorNombre(cuentas, palabras) {
  const lower = (s) => s.toLowerCase();
  return cuentas.filter((c) => palabras.some((p) => lower(c.nombre).includes(p)));
}

export function calcularEstadoResultados() {
  const cuentas = getCuentasCache();

  const ventas = buscarCuentaPorNombre(cuentas, ['venta']).filter((c) => c.tipo === 'ingreso');
  const compras = buscarCuentaPorNombre(cuentas, ['compra']).filter((c) => c.tipo === 'egreso');
  const gastos = cuentas.filter(
    (c) => c.tipo === 'egreso' && !buscarCuentaPorNombre([c], ['compra', 'costo de venta']).length
  );

  const totalVentas = round2(ventas.reduce((s, c) => s + Math.abs(c.saldo), 0));
  const totalCompras = round2(compras.reduce((s, c) => s + Math.abs(c.saldo), 0));
  const totalGastos = round2(gastos.reduce((s, c) => s + Math.abs(c.saldo), 0));

  const invInicial = Number(document.getElementById('ee-inventario-inicial')?.value) || 0;
  const invFinal = Number(document.getElementById('ee-inventario-final')?.value) || 0;

  const costoVentas = round2(invInicial + totalCompras - invFinal);
  const utilidadBruta = round2(totalVentas - costoVentas);
  const utilidadAntesImpuestos = round2(utilidadBruta - totalGastos);

  return {
    totalVentas,
    invInicial,
    totalCompras,
    invFinal,
    costoVentas,
    utilidadBruta,
    totalGastos,
    utilidadAntesImpuestos,
    gastosDetalle: gastos,
  };
}

function renderEstadoResultados() {
  const r = calcularEstadoResultados();
  const cont = document.getElementById('resultado-estado-resultados');

  const filasGastos = r.gastosDetalle
    .map((g) => `<div class="flex justify-between text-sm"><span class="text-slate-500">${g.nombre}</span><span class="font-mono">${formatMoney(Math.abs(g.saldo))}</span></div>`)
    .join('');

  cont.innerHTML = `
    <div class="space-y-1 text-sm">
      <div class="flex justify-between"><span>Ventas Netas</span><span class="font-mono">${formatMoney(r.totalVentas)}</span></div>
      <div class="pl-3 border-l-2 border-slate-100 my-2 space-y-1 text-slate-500">
        <div class="flex justify-between"><span>(+) Inventario Inicial</span><span class="font-mono">${formatMoney(r.invInicial)}</span></div>
        <div class="flex justify-between"><span>(+) Compras</span><span class="font-mono">${formatMoney(r.totalCompras)}</span></div>
        <div class="flex justify-between"><span>(-) Inventario Final</span><span class="font-mono">${formatMoney(r.invFinal)}</span></div>
        <div class="flex justify-between font-medium text-slate-700"><span>(=) Costo de Ventas</span><span class="font-mono">${formatMoney(r.costoVentas)}</span></div>
      </div>
      <div class="flex justify-between font-semibold border-t border-slate-200 pt-2"><span>Utilidad Bruta en Ventas</span><span class="font-mono">${formatMoney(r.utilidadBruta)}</span></div>
      <div class="pl-3 border-l-2 border-slate-100 my-2 space-y-1 text-slate-500">
        <p class="text-xs uppercase text-slate-400">Gastos de Operacion</p>
        ${filasGastos || '<p class="text-xs text-slate-400">Sin gastos registrados</p>'}
      </div>
      <div class="flex justify-between font-bold text-base border-t border-slate-200 pt-2 text-indigo-700">
        <span>Utilidad Antes de Impuestos</span><span class="font-mono">${formatMoney(r.utilidadAntesImpuestos)}</span>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------
// Balance General (Activo = Pasivo + Patrimonio)
// -----------------------------------------------------------------------

function renderBalanceGeneral() {
  const cuentas = getCuentasCache();
  const cont = document.getElementById('resultado-balance-general');

  const activos = cuentas.filter((c) => c.tipo === 'activo');
  const pasivos = cuentas.filter((c) => c.tipo === 'pasivo');
  const patrimonios = cuentas.filter((c) => c.tipo === 'patrimonio');

  const totalActivo = round2(activos.reduce((s, c) => s + c.saldo, 0));
  const totalPasivo = round2(pasivos.reduce((s, c) => s + c.saldo, 0));
  const totalPatrimonioBase = round2(patrimonios.reduce((s, c) => s + c.saldo, 0));

  const { utilidadAntesImpuestos } = calcularEstadoResultados();
  const totalPatrimonio = round2(totalPatrimonioBase + utilidadAntesImpuestos);
  const totalPasivoPatrimonio = round2(totalPasivo + totalPatrimonio);
  const cuadra = totalActivo === totalPasivoPatrimonio;

  const listado = (items) =>
    items
      .map((c) => `<div class="flex justify-between text-sm"><span class="text-slate-500">${c.codigo} - ${c.nombre}</span><span class="font-mono">${formatMoney(c.saldo)}</span></div>`)
      .join('') || '<p class="text-xs text-slate-400">Sin cuentas</p>';

  cont.innerHTML = `
    <div class="grid md:grid-cols-2 gap-6">
      <div>
        <h4 class="font-semibold text-slate-700 mb-2">Activo</h4>
        <div class="space-y-1">${listado(activos)}</div>
        <div class="flex justify-between font-bold border-t border-slate-200 mt-2 pt-2">
          <span>Total Activo</span><span class="font-mono">${formatMoney(totalActivo)}</span>
        </div>
      </div>
      <div>
        <h4 class="font-semibold text-slate-700 mb-2">Pasivo</h4>
        <div class="space-y-1">${listado(pasivos)}</div>
        <div class="flex justify-between font-medium border-t border-slate-200 mt-2 pt-2">
          <span>Total Pasivo</span><span class="font-mono">${formatMoney(totalPasivo)}</span>
        </div>

        <h4 class="font-semibold text-slate-700 mb-2 mt-4">Patrimonio</h4>
        <div class="space-y-1">${listado(patrimonios)}</div>
        <div class="flex justify-between text-sm text-slate-500">
          <span>Utilidad del ejercicio</span><span class="font-mono">${formatMoney(utilidadAntesImpuestos)}</span>
        </div>
        <div class="flex justify-between font-medium border-t border-slate-200 mt-2 pt-2">
          <span>Total Patrimonio</span><span class="font-mono">${formatMoney(totalPatrimonio)}</span>
        </div>

        <div class="flex justify-between font-bold border-t-2 border-slate-300 mt-3 pt-2">
          <span>Total Pasivo + Patrimonio</span><span class="font-mono">${formatMoney(totalPasivoPatrimonio)}</span>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <span class="text-xs font-semibold px-2 py-1 rounded-full ${cuadra ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
        Ecuacion Contable (Activo = Pasivo + Patrimonio): ${cuadra ? 'Cuadrada ✓' : 'NO cuadrada ✕'}
      </span>
    </div>
  `;

  if (!cuadra && totalActivo !== 0) {
    // Aviso silencioso en consola para depuracion; no interrumpe al usuario.
    console.warn('Balance General descuadrado', { totalActivo, totalPasivoPatrimonio });
  }
}
