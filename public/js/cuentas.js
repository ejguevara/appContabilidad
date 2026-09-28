// cuentas.js
// Modulo: Plan de Cuentas + Libro Mayor.

import {
  escucharCuentas,
  crearCuenta,
  eliminarCuenta,
  obtenerMovimientosPorCuenta,
} from './db.js';
import { formatMoney, formatDate, naturalezaCuenta, toast, icono } from './utils.js';

let cuentasCache = [];
let cuentaSeleccionadaId = null;

const TIPO_LABEL = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio',
  ingreso: 'Ingreso',
  egreso: 'Egreso / Gasto',
};

// Catalogo base tipico para un negocio comercial en El Salvador. Los nombres
// coinciden con las palabras clave que ya usan el Dashboard y los Reportes
// (caja/banco -> efectivo, iva debito/credito -> KPI de IVA, venta -> ingresos,
// compra -> costo de ventas), asi que las graficas funcionan desde el inicio.
const CUENTAS_COMUNES = [
  { codigo: '1101', nombre: 'Caja General', tipo: 'activo' },
  { codigo: '1102', nombre: 'Bancos', tipo: 'activo' },
  { codigo: '1201', nombre: 'Cuentas por Cobrar', tipo: 'activo' },
  { codigo: '1202', nombre: 'IVA Credito Fiscal', tipo: 'activo' },
  { codigo: '1301', nombre: 'Inventario de Mercaderias', tipo: 'activo' },
  { codigo: '2101', nombre: 'Cuentas por Pagar', tipo: 'pasivo' },
  { codigo: '2102', nombre: 'IVA Debito Fiscal', tipo: 'pasivo' },
  { codigo: '3101', nombre: 'Capital Social', tipo: 'patrimonio' },
  { codigo: '3201', nombre: 'Utilidades Retenidas', tipo: 'patrimonio' },
  { codigo: '4101', nombre: 'Compras', tipo: 'egreso' },
  { codigo: '4201', nombre: 'Gastos de Venta', tipo: 'egreso' },
  { codigo: '4202', nombre: 'Gastos de Administracion', tipo: 'egreso' },
  { codigo: '4203', nombre: 'Sueldos y Salarios', tipo: 'egreso' },
  { codigo: '5101', nombre: 'Ventas', tipo: 'ingreso' },
];

async function cargarCuentasComunes(btn) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Cargando...';
  }
  let creadas = 0;
  for (const c of CUENTAS_COMUNES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await crearCuenta(c);
      creadas += 1;
    } catch (err) {
      // Si ya existe una cuenta con ese codigo en el documento, seguimos con
      // las demas en vez de detener todo el proceso.
    }
  }
  if (creadas) {
    toast(`Se cargaron ${creadas} cuentas comunes al catalogo.`, 'exito');
  } else {
    toast('No se pudo cargar el catalogo comun.', 'error');
  }
}

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

  escucharCuentas((cuentas) => {
    cuentasCache = cuentas;
    renderArbolCuentas(cuentas);
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
    grupoWrap.innerHTML = `<div class="text-xs font-semibold uppercase tracking-wide text-stone-500 px-2 py-1">${TIPO_LABEL[tipo]}</div>`;

    items.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center gap-2 hover:bg-stone-800 transition ${
        c.id === cuentaSeleccionadaId ? 'bg-amber-500/15 text-amber-400 font-medium' : 'text-stone-300'
      }`;
      btn.innerHTML = `
        <span class="truncate"><span class="text-stone-500 font-mono text-xs mr-1">${c.codigo}</span>${c.nombre}</span>
        <span class="text-xs font-mono ${Number(c.saldo) < 0 ? 'text-rose-500' : 'text-stone-500'}">${formatMoney(c.saldo)}</span>
      `;
      btn.addEventListener('click', () => {
        cuentaSeleccionadaId = c.id;
        renderArbolCuentas(cuentas);
        renderLibroMayor(c.id);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'ml-1 text-stone-300 hover:text-rose-500';
      delBtn.title = 'Eliminar cuenta';
      delBtn.innerHTML = icono('x', 'w-3.5 h-3.5');
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
    cont.innerHTML = `
      <div class="px-2 space-y-3">
        <p class="text-sm text-stone-500">Aun no hay cuentas en este documento.</p>
        <button type="button" data-cargar-comunes
          class="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white transition">
          Cargar catalogo de cuentas comunes
        </button>
      </div>`;
    cont.querySelector('[data-cargar-comunes]')?.addEventListener('click', (e) => cargarCuentasComunes(e.currentTarget));
  }
}

/**
 * Crea un buscador de cuentas: un campo de texto donde se puede escribir el
 * codigo o el nombre de la cuenta, con una lista desplegable de resultados
 * que se filtra mientras se escribe. La cuenta elegida queda guardada en un
 * input oculto con data-campo="cuenta" (mismo selector que antes usaba el
 * <select>), para no tener que tocar quien lo lee (diario.js).
 *
 * Siempre consulta getCuentasCache() al momento de mostrar la lista, asi que
 * no hace falta "repoblarlo" cuando el catalogo de cuentas cambia.
 */
export function crearBuscadorCuenta() {
  const wrap = document.createElement('div');
  wrap.className = 'relative';
  wrap.innerHTML = `
    <input type="text" data-buscar-cuenta autocomplete="off" placeholder="Codigo o nombre de la cuenta..."
      class="w-full rounded-md border-stone-700 bg-stone-800 text-stone-100 placeholder-stone-500 text-sm focus:ring-amber-500 focus:border-amber-500" />
    <input type="hidden" data-campo="cuenta" />
  `;

  const input = wrap.querySelector('[data-buscar-cuenta]');
  const oculto = wrap.querySelector('[data-campo="cuenta"]');

  // La lista se cuelga directo del <body> (con posicion "fixed" calculada a
  // partir del campo de texto) en lugar de vivir dentro de la celda de la
  // tabla. Si se quedara dentro de la fila, al estar "absolute" terminaba
  // flotando encima de las filas de abajo y bloqueaba los clics hacia ellas
  // (por eso solo la primera linea parecia funcionar).
  const lista = document.createElement('ul');
  lista.className = 'hidden fixed z-50 max-h-52 overflow-y-auto rounded-md border border-stone-800 bg-stone-900 shadow-lg text-sm';
  document.body.appendChild(lista);
  wrap._listaCuenta = lista; // referencia para poder limpiarla si se quita la linea

  let opciones = [];
  let activo = -1;

  function opcionesFiltradas(filtro) {
    const q = filtro.trim().toLowerCase();
    return getCuentasCache()
      .slice()
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .filter((c) => !q || c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q));
  }

  function pintarActivo() {
    [...lista.children].forEach((li, i) => li.classList.toggle('bg-amber-500/15', i === activo));
  }

  function posicionarLista() {
    const r = input.getBoundingClientRect();
    lista.style.left = `${r.left}px`;
    lista.style.top = `${r.bottom + 4}px`;
    lista.style.width = `${r.width}px`;
  }

  function abrirLista(filtro) {
    opciones = opcionesFiltradas(filtro);
    activo = -1;
    lista.innerHTML = opciones.length
      ? opciones
          .map(
            (c) => `<li data-id="${c.id}" class="px-3 py-2 cursor-pointer hover:bg-amber-500/15">
              <span class="font-mono text-xs text-stone-500 mr-1">${c.codigo}</span>${c.nombre}
            </li>`
          )
          .join('')
      : '<li class="px-3 py-2 text-stone-500">Sin resultados</li>';
    posicionarLista();
    lista.classList.remove('hidden');
    window.addEventListener('scroll', posicionarLista, true);
    window.addEventListener('resize', posicionarLista);
  }

  function cerrarLista() {
    lista.classList.add('hidden');
    window.removeEventListener('scroll', posicionarLista, true);
    window.removeEventListener('resize', posicionarLista);
  }

  function elegir(cuenta) {
    input.value = `${cuenta.codigo} - ${cuenta.nombre}`;
    oculto.value = cuenta.id;
    cerrarLista();
    oculto.dispatchEvent(new Event('input', { bubbles: true }));
  }

  input.addEventListener('focus', () => abrirLista(input.value));
  input.addEventListener('input', () => {
    // Mientras se escribe, la seleccion anterior deja de ser valida hasta
    // que elijan una cuenta de la lista otra vez.
    oculto.value = '';
    oculto.dispatchEvent(new Event('input', { bubbles: true }));
    abrirLista(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (lista.classList.contains('hidden') && e.key !== 'Escape') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activo = Math.min(activo + 1, opciones.length - 1);
      pintarActivo();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activo = Math.max(activo - 1, 0);
      pintarActivo();
    } else if (e.key === 'Enter') {
      if (activo >= 0 && opciones[activo]) {
        e.preventDefault();
        elegir(opciones[activo]);
      }
    } else if (e.key === 'Escape') {
      cerrarLista();
    }
  });

  // mousedown (no click) para que dispare antes del blur del input de texto.
  lista.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const li = e.target.closest('[data-id]');
    if (!li) return;
    const cuenta = getCuentasCache().find((c) => c.id === li.dataset.id);
    if (cuenta) elegir(cuenta);
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target) && !lista.contains(e.target)) cerrarLista();
  });

  return wrap;
}

async function renderLibroMayor(cuentaId) {
  const cuenta = cuentasCache.find((c) => c.id === cuentaId);
  const cont = document.getElementById('libro-mayor-contenido');
  if (!cuenta) {
    cont.innerHTML = '<p class="text-sm text-stone-500">Selecciona una cuenta del plan de cuentas para ver su Libro Mayor.</p>';
    return;
  }

  cont.innerHTML = '<p class="text-sm text-stone-500">Cargando movimientos...</p>';
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
      <tr class="border-b border-stone-800">
        <td class="px-3 py-2 text-xs text-stone-500">${formatDate(m.fecha)}</td>
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
        <h3 class="font-semibold text-stone-100">${cuenta.codigo} - ${cuenta.nombre}</h3>
        <p class="text-xs text-stone-500 uppercase">${TIPO_LABEL[cuenta.tipo]} · Naturaleza ${naturaleza}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-stone-500">Saldo actual</p>
        <p class="text-lg font-bold ${cuenta.saldo < 0 ? 'text-rose-400' : 'text-stone-100'}">${formatMoney(cuenta.saldo)}</p>
      </div>
    </div>
    <div class="overflow-x-auto rounded-lg border border-stone-800">
      <table class="min-w-full">
        <thead class="bg-stone-800">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-semibold text-stone-500">Fecha</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-stone-500">Concepto</th>
            <th class="px-3 py-2 text-right text-xs font-semibold text-stone-500">Debe</th>
            <th class="px-3 py-2 text-right text-xs font-semibold text-stone-500">Haber</th>
            <th class="px-3 py-2 text-right text-xs font-semibold text-stone-500">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${filasHtml || '<tr><td colspan="5" class="px-3 py-6 text-center text-sm text-stone-500">Esta cuenta aun no tiene movimientos.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}
