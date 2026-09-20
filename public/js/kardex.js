// kardex.js
// Modulo: Kardex de inventario (metodo de Costo Promedio Ponderado).

import { registrarKardex, escucharKardex } from './db.js';
import { formatMoney, formatDate, hoyISO, toast } from './utils.js';

export function initKardex() {
  document.getElementById('kardex-fecha').value = hoyISO();

  const tipoRadios = document.querySelectorAll('input[name="kardex-tipo"]');
  tipoRadios.forEach((r) => r.addEventListener('change', actualizarVisibilidadCosto));
  actualizarVisibilidadCosto();

  document.getElementById('form-kardex').addEventListener('submit', onRegistrarKardex);

  escucharKardex((registros) => renderTablaKardex(registros));
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
        <td class="px-2 py-2 text-sm">${r.concepto}</td>
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
