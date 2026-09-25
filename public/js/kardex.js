// kardex.js
// Modulo: Kardex de inventario. Se registra con Costo Promedio Ponderado y
// se puede ver tambien con el metodo PEPS, mas el reporte de rotacion.

import { registrarKardex, escucharKardex } from './db.js';
import { formatMoney, formatDate, hoyISO, toast } from './utils.js';
import { calcularPEPS, calcularRotacion } from './inventario.js';

const METODOS = {
  cpp: {
    titulo: 'Método: Costo Promedio Ponderado',
    nota: 'C/U = costo promedio de las existencias después de cada movimiento.',
  },
  peps: {
    titulo: 'Método: PEPS (Primeras Entradas, Primeras Salidas)',
    nota: 'C/U = costo del movimiento. Las salidas consumen primero los lotes más antiguos; debajo de cada concepto se ven los lotes que quedan.',
  },
};

let registrosCPP = [];

export function initKardex() {
  document.getElementById('kardex-fecha').value = hoyISO();

  const tipoRadios = document.querySelectorAll('input[name="kardex-tipo"]');
  tipoRadios.forEach((r) => r.addEventListener('change', actualizarVisibilidadCosto));
  actualizarVisibilidadCosto();

  document.getElementById('form-kardex').addEventListener('submit', onRegistrarKardex);

  document.getElementById('kardex-metodo').addEventListener('change', renderKardex);

  escucharKardex((registros) => {
    registrosCPP = registros;
    renderKardex();
  });
}

function metodoSeleccionado() {
  return document.getElementById('kardex-metodo').value;
}

function renderKardex() {
  const metodo = metodoSeleccionado();
  const registrosPEPS = calcularPEPS(registrosCPP);

  document.getElementById('kardex-metodo-titulo').textContent = METODOS[metodo].titulo;
  document.getElementById('kardex-metodo-nota').textContent = METODOS[metodo].nota;

  renderTablaKardex(metodo === 'peps' ? registrosPEPS : registrosCPP);
  renderRotacion(calcularRotacion(registrosCPP), calcularRotacion(registrosPEPS));
}

function tipoSeleccionado() {
  return document.querySelector('input[name="kardex-tipo"]:checked')?.value || 'entrada';
}

function actualizarVisibilidadCosto() {
  const esEntrada = tipoSeleccionado() === 'entrada';
  document.getElementById('kardex-costo-wrap').classList.toggle('hidden', !esEntrada);
}

async function onRegistrarKardex(e) {
  e.preventDefault();
  const fecha = document.getElementById('kardex-fecha').value;
  const asientoId = document.getElementById('kardex-asiento').value.trim();
  const concepto = document.getElementById('kardex-concepto').value.trim();
  const cantidad = Number(document.getElementById('kardex-cantidad').value);
  const costo = Number(document.getElementById('kardex-costo').value);
  const esEntrada = tipoSeleccionado() === 'entrada';

  if (!concepto || !cantidad || cantidad <= 0) {
    toast('Completa el concepto y una cantidad valida.', 'advertencia');
    return;
  }
  if (esEntrada && (!costo || costo <= 0)) {
    toast('Indica el costo unitario de la entrada.', 'advertencia');
    return;
  }

  try {
    await registrarKardex({
      fecha,
      asientoId,
      concepto,
      entrada: esEntrada ? cantidad : 0,
      salida: esEntrada ? 0 : cantidad,
      costoUnitarioEntrada: costo,
    });
    toast('Movimiento de kardex registrado.', 'exito');
    document.getElementById('form-kardex').reset();
    document.getElementById('kardex-fecha').value = hoyISO();
    actualizarVisibilidadCosto();
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

function renderTablaKardex(registros) {
  const tbody = document.getElementById('cuerpo-tabla-kardex');
  tbody.innerHTML = registros
    .map(
      (r, i) => `
      <tr class="border-b border-slate-100">
        <td class="px-2 py-2 text-xs text-slate-400">${i + 1}</td>
        <td class="px-2 py-2 text-xs text-slate-500">${r.asientoId || '-'}</td>
        <td class="px-2 py-2 text-xs text-slate-500 whitespace-nowrap">${formatDate(r.fecha)}</td>
        <td class="px-2 py-2 text-sm">${r.concepto}${r.capas ? renderCapas(r.capas) : ''}</td>
        <td class="px-2 py-2 text-sm text-right font-mono">${r.entrada ? r.entrada : ''}</td>
        <td class="px-2 py-2 text-sm text-right font-mono">${r.salida ? r.salida : ''}</td>
        <td class="px-2 py-2 text-sm text-right font-mono">${r.existencias}</td>
        <td class="px-2 py-2 text-sm text-right font-mono">${formatMoney(r.costoUnitario)}</td>
        <td class="px-2 py-2 text-sm text-right font-mono">${r.deudor ? formatMoney(r.deudor) : ''}</td>
        <td class="px-2 py-2 text-sm text-right font-mono">${r.acreedor ? formatMoney(r.acreedor) : ''}</td>
        <td class="px-2 py-2 text-sm text-right font-mono font-medium">${formatMoney(r.saldo)}</td>
      </tr>`
    )
    .join('');

  if (registros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="px-3 py-6 text-center text-sm text-slate-400">Aun no hay movimientos de kardex.</td></tr>';
  }
}

function renderCapas(capas) {
  const texto = capas.length
    ? capas.map((c) => `${c.cantidad} u × ${formatMoney(c.costo)}`).join(' · ')
    : 'Sin existencias';
  return `<div class="text-xs text-slate-400">Lotes: ${texto}</div>`;
}

function renderRotacion(cpp, peps) {
  const tbody = document.getElementById('cuerpo-rotacion-inventario');
  if (!cpp || !peps) {
    tbody.innerHTML = '<tr><td colspan="3" class="px-3 py-6 text-center text-sm text-slate-400">Aun no hay movimientos de kardex.</td></tr>';
    return;
  }

  const veces = (n) => `${n.toFixed(2)} veces`;
  const dias = (n) => `${n.toFixed(1)} días`;
  const filas = [
    ['Costo de ventas', formatMoney(cpp.costoVentas), formatMoney(peps.costoVentas)],
    ['Inventario inicial', formatMoney(cpp.inventarioInicial), formatMoney(peps.inventarioInicial)],
    ['Inventario final', formatMoney(cpp.inventarioFinal), formatMoney(peps.inventarioFinal)],
    ['Inventario promedio', formatMoney(cpp.inventarioPromedio), formatMoney(peps.inventarioPromedio)],
    ['Rotación de inventario', veces(cpp.rotacion), veces(peps.rotacion), true],
    ['Días del período', `${cpp.diasPeriodo} días`, `${peps.diasPeriodo} días`],
    ['Días de inventario', dias(cpp.diasInventario), dias(peps.diasInventario), true],
  ];

  tbody.innerHTML = filas
    .map(
      ([concepto, a, b, destacado]) => `
      <tr class="border-b border-slate-100 ${destacado ? 'font-semibold text-slate-800' : ''}">
        <td class="px-3 py-2 text-sm">${concepto}</td>
        <td class="px-3 py-2 text-sm text-right font-mono">${a}</td>
        <td class="px-3 py-2 text-sm text-right font-mono">${b}</td>
      </tr>`
    )
    .join('');
}
