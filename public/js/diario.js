// diario.js
// Modulo: Libro Diario (registro de partidas dobles con validacion de cuadre).

import { registrarPartida, escucharPartidas, anularPartida } from './db.js';
import { getCuentasCache } from './cuentas.js';
import { formatMoney, formatDate, hoyISO, calcularIVA, toast, round2, icono } from './utils.js';

let partidasCache = [];
let filaContador = 0;

export function initDiario() {
  document.getElementById('diario-fecha').value = hoyISO();

  document.getElementById('btn-agregar-linea').addEventListener('click', () => agregarLinea());
  agregarLinea();
  agregarLinea();

  document.getElementById('form-partida').addEventListener('submit', onGuardarPartida);
  document.getElementById('btn-limpiar-partida').addEventListener('click', () => resetFormulario());

  document.getElementById('btn-calc-iva').addEventListener('click', abrirCalculadoraIVA);
  document.getElementById('iva-modal-cerrar').addEventListener('click', cerrarCalculadoraIVA);
  document.getElementById('iva-modal-calcular').addEventListener('click', calcularEnModalIVA);

  document.getElementById('filtro-partidas').addEventListener('input', () => renderTablaPartidas());

  document.getElementById('cuerpo-lineas').addEventListener('input', actualizarCuadre);

  escucharPartidas((partidas) => {
    partidasCache = partidas;
    renderTablaPartidas();
  });
}

// -----------------------------------------------------------------------
// Formulario dinamico de partida doble
// -----------------------------------------------------------------------

function agregarLinea() {
  filaContador += 1;
  const id = `linea-${filaContador}`;
  const tbody = document.getElementById('cuerpo-lineas');
  const tr = document.createElement('tr');
  tr.id = id;
  tr.className = 'border-b border-slate-100';
  tr.innerHTML = `
    <td class="py-1 pr-2">
      <select data-cuentas-select data-campo="cuenta" class="w-full rounded-md border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        <option value="">Selecciona una cuenta...</option>
      </select>
    </td>
    <td class="py-1 px-2 w-32">
      <input type="number" step="0.01" min="0" data-campo="debe" placeholder="0.00"
        class="w-full rounded-md border-slate-300 text-sm text-right focus:ring-indigo-500 focus:border-indigo-500" />
    </td>
    <td class="py-1 px-2 w-32">
      <input type="number" step="0.01" min="0" data-campo="haber" placeholder="0.00"
        class="w-full rounded-md border-slate-300 text-sm text-right focus:ring-indigo-500 focus:border-indigo-500" />
    </td>
    <td class="py-1 pl-2 w-10 text-center">
      <button type="button" class="text-slate-300 hover:text-rose-500" title="Quitar linea" data-quitar>${icono('x')}</button>
    </td>
  `;
  tbody.appendChild(tr);

  // Repuebla el select recien creado con las cuentas ya cargadas.
  const cuentas = getCuentasCache();
  const select = tr.querySelector('select');
  cuentas
    .slice()
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.codigo} - ${c.nombre}`;
      select.appendChild(opt);
    });

  tr.querySelector('[data-quitar]').addEventListener('click', () => {
    tr.remove();
    actualizarCuadre();
  });

  // Mutuamente exclusivo simple: si escriben en Debe, limpiar Haber y viceversa.
  const debeInput = tr.querySelector('[data-campo="debe"]');
  const haberInput = tr.querySelector('[data-campo="haber"]');
  debeInput.addEventListener('input', () => {
    if (Number(debeInput.value) > 0) haberInput.value = '';
    actualizarCuadre();
  });
  haberInput.addEventListener('input', () => {
    if (Number(haberInput.value) > 0) debeInput.value = '';
    actualizarCuadre();
  });
}

function leerLineas() {
  const filas = [...document.querySelectorAll('#cuerpo-lineas tr')];
  return filas
    .map((tr) => ({
      cuentaId: tr.querySelector('[data-campo="cuenta"]').value,
      debe: Number(tr.querySelector('[data-campo="debe"]').value) || 0,
      haber: Number(tr.querySelector('[data-campo="haber"]').value) || 0,
    }))
    .filter((l) => l.cuentaId && (l.debe > 0 || l.haber > 0));
}

function actualizarCuadre() {
  const lineas = leerLineas();
  const totalDebe = round2(lineas.reduce((s, l) => s + l.debe, 0));
  const totalHaber = round2(lineas.reduce((s, l) => s + l.haber, 0));
  const diferencia = round2(totalDebe - totalHaber);

  document.getElementById('total-debe').textContent = formatMoney(totalDebe);
  document.getElementById('total-haber').textContent = formatMoney(totalHaber);

  const badge = document.getElementById('estado-cuadre');
  const btnGuardar = document.getElementById('btn-guardar-partida');
  if (lineas.length < 2) {
    badge.textContent = 'Agrega al menos 2 lineas';
    badge.className = 'text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500';
    btnGuardar.disabled = true;
  } else if (diferencia === 0) {
    badge.innerHTML = `Cuadrada ${icono('check', 'w-3.5 h-3.5')}`;
    badge.className = 'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700';
    btnGuardar.disabled = false;
  } else {
    badge.textContent = `Descuadre: ${formatMoney(Math.abs(diferencia))}`;
    badge.className = 'text-xs font-semibold px-2 py-1 rounded-full bg-rose-100 text-rose-700';
    btnGuardar.disabled = true;
  }

  return { lineas, totalDebe, totalHaber, diferencia };
}

async function onGuardarPartida(e) {
  e.preventDefault();
  const { lineas, diferencia } = actualizarCuadre();
  if (diferencia !== 0 || lineas.length < 2) {
    toast('La partida debe cuadrar (Debe = Haber) antes de guardarla.', 'advertencia');
    return;
  }
  const fecha = document.getElementById('diario-fecha').value;
  const concepto = document.getElementById('diario-concepto').value.trim();
  if (!concepto) {
    toast('Escribe un concepto para la partida.', 'advertencia');
    return;
  }

  try {
    await registrarPartida({ fecha, concepto, movimientos: lineas });
    toast('Partida registrada correctamente.', 'exito');
    resetFormulario();
  } catch (err) {
    toast(`No se pudo guardar la partida: ${err.message}`, 'error');
  }
}

function resetFormulario() {
  document.getElementById('form-partida').reset();
  document.getElementById('diario-fecha').value = hoyISO();
  document.getElementById('cuerpo-lineas').innerHTML = '';
  filaContador = 0;
  agregarLinea();
  agregarLinea();
  actualizarCuadre();
}

// -----------------------------------------------------------------------
// Calculadora rapida de IVA (13%) para compras/ventas
// -----------------------------------------------------------------------

function abrirCalculadoraIVA() {
  document.getElementById('iva-modal').classList.remove('hidden');
  document.getElementById('iva-modal-base').value = '';
  document.getElementById('iva-modal-resultado').classList.add('hidden');
}

function cerrarCalculadoraIVA() {
  document.getElementById('iva-modal').classList.add('hidden');
}

function calcularEnModalIVA() {
  const base = document.getElementById('iva-modal-base').value;
  const { base: b, iva, total } = calcularIVA(base);
  document.getElementById('iva-res-base').textContent = formatMoney(b);
  document.getElementById('iva-res-iva').textContent = formatMoney(iva);
  document.getElementById('iva-res-total').textContent = formatMoney(total);
  document.getElementById('iva-modal-resultado').classList.remove('hidden');
}

// -----------------------------------------------------------------------
// Listado y filtrado de partidas registradas
// -----------------------------------------------------------------------

function renderTablaPartidas() {
  const cuentas = getCuentasCache();
  const mapaCuentas = new Map(cuentas.map((c) => [c.id, c]));
  const filtro = (document.getElementById('filtro-partidas').value || '').toLowerCase();

  const filtradas = partidasCache.filter((p) => {
    if (!filtro) return true;
    return (
      p.concepto?.toLowerCase().includes(filtro) ||
      formatDate(p.fecha).includes(filtro) ||
      p.movimientos?.some((m) => mapaCuentas.get(m.cuentaId)?.nombre?.toLowerCase().includes(filtro))
    );
  });

  const tbody = document.getElementById('cuerpo-tabla-partidas');
  tbody.innerHTML = filtradas
    .map((p) => {
      const detalle = p.movimientos
        .map((m) => {
          const c = mapaCuentas.get(m.cuentaId);
          const nombre = c ? `${c.codigo} - ${c.nombre}` : 'Cuenta eliminada';
          return `<div class="flex justify-between gap-4"><span class="text-slate-500">${nombre}</span><span class="font-mono">${m.debe ? formatMoney(m.debe) : ''} ${m.haber ? formatMoney(m.haber) : ''}</span></div>`;
        })
        .join('');
      const anulada = p.estado === 'anulada';
      return `
        <tr class="border-b border-slate-100 align-top ${anulada ? 'opacity-50' : ''}">
          <td class="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">${formatDate(p.fecha)}</td>
          <td class="px-3 py-3 text-sm">
            <p class="font-medium text-slate-800">${p.concepto} ${anulada ? '<span class="text-rose-500 text-xs font-semibold">(ANULADA)</span>' : ''}</p>
            <div class="text-xs mt-1 space-y-0.5">${detalle}</div>
          </td>
          <td class="px-3 py-3 text-sm text-right font-mono font-medium">${formatMoney(p.totalDebe)}</td>
          <td class="px-3 py-3 text-center">
            ${
              anulada
                ? ''
                : `<button data-anular="${p.id}" class="text-xs text-rose-500 hover:underline">Anular</button>`
            }
          </td>
        </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-anular]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Anular esta partida? Se revertira su efecto en los saldos de las cuentas.')) return;
      try {
        await anularPartida(btn.dataset.anular);
        toast('Partida anulada.', 'exito');
      } catch (err) {
        toast(`Error: ${err.message}`, 'error');
      }
    });
  });

  if (filtradas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="px-3 py-6 text-center text-sm text-slate-400">No hay partidas registradas todavia.</td></tr>';
  }
}
