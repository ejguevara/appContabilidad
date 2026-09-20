// cuentas.js
// Modulo: Plan de Cuentas + Libro Mayor.

import {
  escucharCuentas,
  crearCuenta,
  eliminarCuenta,
  cargarPlanDeCuentasBase,
  obtenerMovimientosPorCuenta,
} from './db.js';
import { formatMoney, formatDate, naturalezaCuenta, toast } from './utils.js';

let cuentasCache = [];
let cuentaSeleccionadaId = null;

const TIPO_LABEL = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio',
  ingreso: 'Ingreso',
  egreso: 'Egreso / Gasto',
};

export function getCuentasCache() {
  return cuentasCache;
}

export function initCuentas() {
  const form = document.getElementById('form-nueva-cuenta');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = document.getElementById('cuenta-codigo').value.trim();
    const nombre = document.getElementById('cuenta-nombre').value.trim();
    const tipo = document.getElementById('cuenta-tipo').value;
    if (!codigo || !nombre || !tipo) return;
    try {
      await crearCuenta({ codigo, nombre, tipo });
      toast('Cuenta creada correctamente.', 'exito');
      form.reset();
    } catch (err) {
      toast(`Error al crear la cuenta: ${err.message}`, 'error');
    }
  });

  document.getElementById('btn-cargar-plan-base').addEventListener('click', async () => {
    if (!confirm('Esto agregara un catalogo de cuentas base de ejemplo. ¿Continuar?')) return;
    try {
      await cargarPlanDeCuentasBase();
      toast('Plan de cuentas base cargado.', 'exito');
    } catch (err) {
      toast(`Error: ${err.message}`, 'error');
    }
  });

  escucharCuentas((cuentas) => {
    cuentasCache = cuentas;
    renderArbolCuentas(cuentas);
    renderSelectsCuentas(cuentas);
    if (cuentaSeleccionadaId) renderLibroMayor(cuentaSeleccionadaId);
    document.dispatchEvent(new CustomEvent('cuentas:actualizadas', { detail: cuentas }));
  });
}

function renderArbolCuentas(cuentas) {
  const cont = document.getElementById('arbol-cuentas');
  cont.innerHTML = '';

  const grupos = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso'];
  grupos.forEach((tipo) => {
    const items = cuentas.filter((c) => c.tipo === tipo).sort((a, b) => a.codigo.localeCompare(b.codigo));
    if (items.length === 0) return;

    const grupoWrap = document.createElement('div');
    grupoWrap.className = 'mb-3';
    grupoWrap.innerHTML = `<div class="text-xs font-semibold uppercase tracking-wide text-slate-400 px-2 py-1">${TIPO_LABEL[tipo]}</div>`;

    items.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center gap-2 hover:bg-slate-100 transition ${
        c.id === cuentaSeleccionadaId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'
      }`;
      btn.innerHTML = `
        <span class="truncate"><span class="text-slate-400 font-mono text-xs mr-1">${c.codigo}</span>${c.nombre}</span>
        <span class="text-xs font-mono ${Number(c.saldo) < 0 ? 'text-rose-500' : 'text-slate-500'}">${formatMoney(c.saldo)}</span>
      `;
      btn.addEventListener('click', () => {
        cuentaSeleccionadaId = c.id;
        renderArbolCuentas(cuentas);
        renderLibroMayor(c.id);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'ml-1 text-slate-300 hover:text-rose-500';
      delBtn.title = 'Eliminar cuenta';
      delBtn.innerHTML = '✕';
      delBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (Number(c.saldo) !== 0) {
          toast('No puedes eliminar una cuenta con saldo distinto de cero.', 'advertencia');
          return;
        }
        if (!confirm(`¿Eliminar la cuenta ${c.codigo} - ${c.nombre}?`)) return;
        await eliminarCuenta(c.id);
        toast('Cuenta eliminada.', 'exito');
      });

      const row = document.createElement('div');
      row.className = 'flex items-center';
      row.appendChild(btn);
      row.appendChild(delBtn);
      grupoWrap.appendChild(row);
    });

    cont.appendChild(grupoWrap);
  });

  if (cuentas.length === 0) {
    cont.innerHTML = '<p class="text-sm text-slate-400 px-2">Aun no hay cuentas. Crea una o carga el plan de cuentas base.</p>';
  }
}

function renderSelectsCuentas(cuentas) {
  const selects = document.querySelectorAll('select[data-cuentas-select]');
  selects.forEach((select) => {
    const valorPrevio = select.value;
    select.innerHTML = '<option value="">Selecciona una cuenta...</option>';
    cuentas
      .slice()
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.codigo} - ${c.nombre}`;
        select.appendChild(opt);
      });
    if (valorPrevio) select.value = valorPrevio;
  });
}

async function renderLibroMayor(cuentaId) {
  const cuenta = cuentasCache.find((c) => c.id === cuentaId);
  const cont = document.getElementById('libro-mayor-contenido');
  if (!cuenta) {
    cont.innerHTML = '<p class="text-sm text-slate-400">Selecciona una cuenta del plan de cuentas para ver su Libro Mayor.</p>';
    return;
  }

  cont.innerHTML = '<p class="text-sm text-slate-400">Cargando movimientos...</p>';
  const movimientos = await obtenerMovimientosPorCuenta(cuentaId);
  const naturaleza = naturalezaCuenta(cuenta.tipo);

  let saldoAcumulado = 0;
  const filas = movimientos.map((m) => {
    saldoAcumulado += naturaleza === 'deudora' ? m.debe - m.haber : m.haber - m.debe;
    return { ...m, saldoAcumulado };
  });

  const filasHtml = filas
    .map(
      (m) => `
      <tr class="border-b border-slate-100">
        <td class="px-3 py-2 text-xs text-slate-500">${formatDate(m.fecha)}</td>
        <td class="px-3 py-2 text-sm">${m.concepto || ''}</td>
        <td class="px-3 py-2 text-sm text-right font-mono">${m.debe ? formatMoney(m.debe) : ''}</td>
        <td class="px-3 py-2 text-sm text-right font-mono">${m.haber ? formatMoney(m.haber) : ''}</td>
        <td class="px-3 py-2 text-sm text-right font-mono font-medium">${formatMoney(m.saldoAcumulado)}</td>
      </tr>`
    )
    .join('');

  cont.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="font-semibold text-slate-800">${cuenta.codigo} - ${cuenta.nombre}</h3>
        <p class="text-xs text-slate-400 uppercase">${TIPO_LABEL[cuenta.tipo]} · Naturaleza ${naturaleza}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-slate-400">Saldo actual</p>
        <p class="text-lg font-bold ${cuenta.saldo < 0 ? 'text-rose-600' : 'text-slate-800'}">${formatMoney(cuenta.saldo)}</p>
      </div>
    </div>
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="min-w-full">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-500">Fecha</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-slate-500">Concepto</th>
            <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Debe</th>
            <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Haber</th>
            <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${filasHtml || '<tr><td colspan="5" class="px-3 py-6 text-center text-sm text-slate-400">Esta cuenta aun no tiene movimientos.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}
