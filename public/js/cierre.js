// cierre.js
// Modulo: Cierre e Impuestos - Liquidacion del IVA (Debito Fiscal vs Credito Fiscal).

import { registrarPartida } from './db.js';
import { getCuentasCache } from './cuentas.js';
import { formatMoney, hoyISO, round2, toast } from './utils.js';

export function initCierre() {
  document.getElementById('cierre-fecha').value = hoyISO();
  document.getElementById('btn-previsualizar-cierre').addEventListener('click', previsualizarCierre);
  document.getElementById('btn-generar-cierre').addEventListener('click', generarPartidaCierre);
  document.getElementById('btn-generar-cierre').disabled = true;
}

function leerSelects() {
  return {
    debitoId: document.getElementById('select-iva-debito').value,
    creditoId: document.getElementById('select-iva-credito').value,
    liquidacionId: document.getElementById('select-iva-liquidacion').value,
  };
}

function calcularLiquidacion() {
  const { debitoId, creditoId, liquidacionId } = leerSelects();
  if (!debitoId || !creditoId || !liquidacionId) return null;
  if (debitoId === creditoId || debitoId === liquidacionId || creditoId === liquidacionId) {
    toast('Selecciona tres cuentas distintas para el cierre de IVA.', 'advertencia');
    return null;
  }

  const cuentas = getCuentasCache();
  const debito = cuentas.find((c) => c.id === debitoId);
  const credito = cuentas.find((c) => c.id === creditoId);
  const liquidacion = cuentas.find((c) => c.id === liquidacionId);
  if (!debito || !credito || !liquidacion) return null;

  const saldoDebito = round2(Math.abs(debito.saldo)); // IVA Debito Fiscal (ventas) - naturaleza acreedora
  const saldoCredito = round2(Math.abs(credito.saldo)); // IVA Credito Fiscal (compras) - naturaleza deudora
  const diferencia = round2(saldoDebito - saldoCredito);

  let resultado;
  if (diferencia > 0) {
    resultado = { tipo: 'por_pagar', monto: diferencia };
  } else if (diferencia < 0) {
    resultado = { tipo: 'a_favor', monto: round2(Math.abs(diferencia)) };
  } else {
    resultado = { tipo: 'sin_diferencia', monto: 0 };
  }

  return { debito, credito, liquidacion, saldoDebito, saldoCredito, ...resultado };
}

function previsualizarCierre() {
  const calculo = calcularLiquidacion();
  const cont = document.getElementById('resultado-cierre');
  const btnGenerar = document.getElementById('btn-generar-cierre');

  if (!calculo) {
    cont.innerHTML = '<p class="text-sm text-amber-600">Selecciona las tres cuentas (Debito Fiscal, Credito Fiscal y cuenta de liquidacion) para calcular.</p>';
    btnGenerar.disabled = true;
    return;
  }

  const { debito, credito, liquidacion, saldoDebito, saldoCredito, tipo, monto } = calculo;

  let mensaje;
  let colorClase;
  if (tipo === 'por_pagar') {
    mensaje = `IVA por Pagar: ${formatMoney(monto)} (el Debito Fiscal supera al Credito Fiscal)`;
    colorClase = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (tipo === 'a_favor') {
    mensaje = `Remanente / Credito Fiscal a favor: ${formatMoney(monto)} (el Credito Fiscal supera al Debito Fiscal)`;
    colorClase = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else {
    mensaje = 'El Debito Fiscal y el Credito Fiscal estan exactamente iguales. No hay IVA por liquidar este periodo.';
    colorClase = 'text-slate-600 bg-slate-50 border-slate-200';
  }

  cont.innerHTML = `
    <div class="grid grid-cols-2 gap-3 mb-3 text-sm">
      <div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
        <p class="text-xs text-slate-400">${debito.codigo} - ${debito.nombre}</p>
        <p class="font-mono font-semibold">${formatMoney(saldoDebito)}</p>
      </div>
      <div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
        <p class="text-xs text-slate-400">${credito.codigo} - ${credito.nombre}</p>
        <p class="font-mono font-semibold">${formatMoney(saldoCredito)}</p>
      </div>
    </div>
    <div class="p-3 rounded-lg border ${colorClase} text-sm font-medium">${mensaje}</div>
    ${
      tipo !== 'sin_diferencia'
        ? `<p class="text-xs text-slate-400 mt-2">Cuenta de liquidacion: ${liquidacion.codigo} - ${liquidacion.nombre}</p>`
        : ''
    }
  `;

  btnGenerar.disabled = tipo === 'sin_diferencia';
}

async function generarPartidaCierre() {
  const calculo = calcularLiquidacion();
  if (!calculo || calculo.tipo === 'sin_diferencia') return;

  const { debito, credito, liquidacion, saldoDebito, saldoCredito, tipo, monto } = calculo;
  const fecha = document.getElementById('cierre-fecha').value;

  let movimientos;
  let concepto;
  if (tipo === 'por_pagar') {
    // Se cancelan Debito y Credito Fiscal contra la cuenta de IVA por Pagar (pasivo).
    movimientos = [
      { cuentaId: debito.id, debe: saldoDebito, haber: 0 },
      { cuentaId: credito.id, debe: 0, haber: saldoCredito },
      { cuentaId: liquidacion.id, debe: 0, haber: monto },
    ];
    concepto = `Liquidacion de IVA del periodo - IVA por Pagar de ${formatMoney(monto)}`;
  } else {
    // Credito Fiscal mayor que Debito Fiscal: queda un remanente a favor (activo).
    movimientos = [
      { cuentaId: debito.id, debe: saldoDebito, haber: 0 },
      { cuentaId: liquidacion.id, debe: monto, haber: 0 },
      { cuentaId: credito.id, debe: 0, haber: saldoCredito },
    ];
    concepto = `Liquidacion de IVA del periodo - Remanente/Credito Fiscal a favor de ${formatMoney(monto)}`;
  }

  try {
    await registrarPartida({ fecha, concepto, movimientos });
    toast('Partida de liquidacion de IVA generada en el Libro Diario.', 'exito');
    document.getElementById('btn-generar-cierre').disabled = true;
  } catch (err) {
    toast(`No se pudo generar la partida de cierre: ${err.message}`, 'error');
  }
}
