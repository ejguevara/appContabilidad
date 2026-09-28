// retenciones.js
// Modulo: Retenciones de impuestos (IVA y Renta) - El Salvador.
// Vive dentro de la pestana "Cierre e Impuestos".
//
// Calcula la retencion segun el Codigo Tributario, arma la partida doble
// completa y la registra en el Libro Diario (la API valida el cuadre y
// mayoriza igual que cualquier otra partida).
//
//   IVA 1 % retenido a proveedor ........ Art. 162 C.T. (compras >= $100)
//   IVA 1 % retenido por cliente ........ Art. 162 C.T. (ventas  >= $100)
//   Renta 10 % servicios persona natural  Art. 156 L.I.S.R.
//   Pago a cuenta 1.75 % ingresos brutos  Art. 151 C.T.

import { registrarPartida, crearCuenta } from './db.js';
import { getCuentasCache } from './cuentas.js';
import { formatMoney, hoyISO, round2, toast, IVA_TASA } from './utils.js';

const MONTO_MINIMO_RETENCION_IVA = 100;

/** Cuentas que usa el modulo. Tambien estan en data.sql y en el plan base. */
export const CUENTAS_RETENCION = [
  { codigo: '1106', nombre: 'IVA Retenido por Clientes', tipo: 'activo' },
  { codigo: '1107', nombre: 'Pago a Cuenta de Renta', tipo: 'activo' },
  { codigo: '2104', nombre: 'Retencion de IVA por Pagar', tipo: 'pasivo' },
  { codigo: '2105', nombre: 'Retencion de Renta por Pagar', tipo: 'pasivo' },
  { codigo: '2106', nombre: 'Pago a Cuenta por Pagar', tipo: 'pasivo' },
  { codigo: '4105', nombre: 'Honorarios y Servicios Profesionales', tipo: 'egreso' },
];

// Cada tipo define: textos del formulario, cuentas sugeridas (por codigo) y
// como se arma la partida a partir de la base.
const TIPOS = {
  iva_proveedor: {
    nombre: 'Retencion de IVA 1 % a proveedor',
    ley: 'Art. 162 Codigo Tributario',
    ayuda:
      'Somos gran contribuyente y compramos a otro contribuyente. Retenemos el 1 % del precio (sin IVA) cuando la compra es de $100 o mas, y le pagamos al proveedor el total menos esa retencion.',
    tasa: 0.01,
    etiquetaBase: 'Valor de la compra (sin IVA)',
    etiquetaCargo: 'Cuenta de la compra o gasto',
    etiquetaContra: 'Cuenta con la que se paga (Bancos / Proveedores)',
    cargo: '4101',
    contra: '2101',
    minimo: MONTO_MINIMO_RETENCION_IVA,
    concepto: (base) => `Compra de ${formatMoney(base)} con retencion de IVA 1 % (Art. 162 C.T.)`,
    movimientos: (base, r, c) => {
      const iva = round2(base * IVA_TASA);
      return [
        { cuenta: c.cargo, debe: base, haber: 0 },
        { cuenta: c['1104'], debe: iva, haber: 0 },
        { cuenta: c['2104'], debe: 0, haber: r },
        { cuenta: c.contra, debe: 0, haber: round2(base + iva - r) },
      ];
    },
  },
  iva_cliente: {
    nombre: 'IVA 1 % retenido por cliente',
    ley: 'Art. 162 Codigo Tributario',
    ayuda:
      'Vendemos a un gran contribuyente y el nos retiene el 1 % del precio (sin IVA) en ventas de $100 o mas. Ese 1 % queda a nuestro favor y se descuenta del IVA a pagar en la declaracion (F-07).',
    tasa: 0.01,
    etiquetaBase: 'Valor de la venta (sin IVA)',
    etiquetaCargo: 'Cuenta de ingreso',
    etiquetaContra: 'Cuenta donde se cobra (Bancos / Clientes)',
    cargo: '5101',
    contra: '1103',
    minimo: MONTO_MINIMO_RETENCION_IVA,
    concepto: (base) => `Venta de ${formatMoney(base)} con IVA 1 % retenido por el cliente (Art. 162 C.T.)`,
    movimientos: (base, r, c) => {
      const iva = round2(base * IVA_TASA);
      return [
        { cuenta: c.contra, debe: round2(base + iva - r), haber: 0 },
        { cuenta: c['1106'], debe: r, haber: 0 },
        { cuenta: c.cargo, debe: 0, haber: base },
        { cuenta: c['2102'], debe: 0, haber: iva },
      ];
    },
  },
  renta_servicios: {
    nombre: 'Retencion de Renta 10 % por servicios',
    ley: 'Art. 156 Ley de Impuesto sobre la Renta',
    ayuda:
      'Pagamos servicios (honorarios, comisiones, etc.) a una persona natural. Retenemos el 10 % del monto y lo enteramos al Ministerio de Hacienda en el F-14; a la persona se le paga el 90 %.',
    tasa: 0.1,
    etiquetaBase: 'Monto del servicio',
    etiquetaCargo: 'Cuenta de gasto',
    etiquetaContra: 'Cuenta con la que se paga (Bancos / Caja)',
    cargo: '4105',
    contra: '1102',
    minimo: 0,
    concepto: (base) => `Pago de servicios por ${formatMoney(base)} con retencion de Renta 10 % (Art. 156 L.I.S.R.)`,
    movimientos: (base, r, c) => [
      { cuenta: c.cargo, debe: base, haber: 0 },
      { cuenta: c['2105'], debe: 0, haber: r },
      { cuenta: c.contra, debe: 0, haber: round2(base - r) },
    ],
  },
  pago_cuenta: {
    nombre: 'Pago a cuenta 1.75 % sobre ingresos brutos',
    ley: 'Art. 151 Codigo Tributario',
    ayuda:
      'Anticipo mensual del Impuesto sobre la Renta: 1.75 % de los ingresos brutos del mes. Se declara en el F-14 y al final del ano se descuenta del impuesto calculado. La base se llena con el total de ingresos (codigo 5), pero puedes cambiarla.',
    tasa: 0.0175,
    etiquetaBase: 'Ingresos brutos del periodo',
    etiquetaCargo: null,
    etiquetaContra: null,
    minimo: 0,
    concepto: (base) => `Pago a cuenta de Renta 1.75 % sobre ingresos brutos de ${formatMoney(base)} (Art. 151 C.T.)`,
    movimientos: (base, r, c) => [
      { cuenta: c['1107'], debe: r, haber: 0 },
      { cuenta: c['2106'], debe: 0, haber: r },
    ],
  },
};

// Codigos fijos que usa cada tipo (ademas de las cuentas elegidas en los selects).
const CODIGOS_FIJOS = {
  iva_proveedor: ['1104', '2104'],
  iva_cliente: ['1106', '2102'],
  renta_servicios: ['2105'],
  pago_cuenta: ['1107', '2106'],
};

let ultimoCalculo = null;

const $ = (id) => document.getElementById(id);

function cuentaPorCodigo(codigo) {
  return getCuentasCache().find((c) => c.codigo === codigo);
}

export function initRetenciones() {
  const selectTipo = $('ret-tipo');
  selectTipo.innerHTML = Object.entries(TIPOS)
    .map(([clave, t]) => `<option value="${clave}">${t.nombre}</option>`)
    .join('');

  $('ret-fecha').value = hoyISO();
  selectTipo.addEventListener('change', () => aplicarTipo(true));
  $('btn-ret-calcular').addEventListener('click', calcularRetencion);
  $('btn-ret-registrar').addEventListener('click', registrarRetencion);
  $('btn-ret-crear-cuentas').addEventListener('click', crearCuentasFaltantes);
  ['ret-base', 'ret-cargo', 'ret-contra', 'ret-fecha'].forEach((id) => $(id).addEventListener('input', invalidarCalculo));

  document.addEventListener('cuentas:actualizadas', () => {
    aplicarTipo(false);
    renderResumen();
  });

  aplicarTipo(true);
  renderResumen();
}

/** Ajusta etiquetas y cuentas sugeridas al tipo elegido. `forzar` reemplaza lo que haya elegido el usuario. */
function aplicarTipo(forzar) {
  const tipo = TIPOS[$('ret-tipo').value];
  $('ret-ley').textContent = tipo.ley;
  $('ret-ayuda').textContent = tipo.ayuda;
  $('ret-label-base').textContent = tipo.etiquetaBase;
  $('ret-tasa').textContent = `${(tipo.tasa * 100).toLocaleString('es-SV')} %`;

  const usaCuentas = Boolean(tipo.etiquetaCargo);
  $('ret-bloque-cuentas').classList.toggle('hidden', !usaCuentas);
  if (usaCuentas) {
    $('ret-label-cargo').textContent = tipo.etiquetaCargo;
    $('ret-label-contra').textContent = tipo.etiquetaContra;
    sugerirCuenta('ret-cargo', tipo.cargo, forzar);
    sugerirCuenta('ret-contra', tipo.contra, forzar);
  }

  if ($('ret-tipo').value === 'pago_cuenta' && (forzar || !$('ret-base').value)) {
    const ingresos = getCuentasCache()
      .filter((c) => String(c.codigo).startsWith('5'))
      .reduce((s, c) => s + Math.abs(c.saldo), 0);
    $('ret-base').value = ingresos ? round2(ingresos).toFixed(2) : '';
  } else if (forzar) {
    $('ret-base').value = '';
  }

  revisarCuentasFaltantes();
  if (forzar) invalidarCalculo();
}

function sugerirCuenta(selectId, codigo, forzar) {
  const select = $(selectId);
  if (!forzar && select.value) return;
  const cuenta = cuentaPorCodigo(codigo);
  select.value = cuenta ? cuenta.id : '';
}

function codigosFaltantes() {
  const tipo = $('ret-tipo').value;
  return CODIGOS_FIJOS[tipo].filter((codigo) => !cuentaPorCodigo(codigo));
}

function revisarCuentasFaltantes() {
  const faltan = CUENTAS_RETENCION.filter((c) => !cuentaPorCodigo(c.codigo));
  const aviso = $('ret-aviso-cuentas');
  aviso.classList.toggle('hidden', faltan.length === 0);
  $('ret-cuentas-faltantes').textContent = faltan.map((c) => `${c.codigo} ${c.nombre}`).join(', ');
}

async function crearCuentasFaltantes() {
  const faltan = CUENTAS_RETENCION.filter((c) => !cuentaPorCodigo(c.codigo));
  try {
    for (const cuenta of faltan) await crearCuenta(cuenta);
    toast(`Se crearon ${faltan.length} cuentas de retencion en el catalogo.`, 'exito');
  } catch (err) {
    toast(`No se pudieron crear las cuentas: ${err.message}`, 'error');
  }
}

function invalidarCalculo() {
  ultimoCalculo = null;
  $('btn-ret-registrar').disabled = true;
  $('ret-resultado').innerHTML = '';
}

function calcularRetencion() {
  invalidarCalculo();
  const claveTipo = $('ret-tipo').value;
  const tipo = TIPOS[claveTipo];
  const cont = $('ret-resultado');
  const aviso = (texto) => {
    cont.innerHTML = `<p class="text-sm text-amber-600">${texto}</p>`;
  };

  const base = round2(Number($('ret-base').value));
  if (!(base > 0)) return aviso('Escribe un monto base mayor que cero.');

  const faltan = codigosFaltantes();
  if (faltan.length) return aviso(`Faltan cuentas en el catalogo (${faltan.join(', ')}). Usa el boton "Crear cuentas de retencion".`);

  const cuentas = {};
  for (const codigo of CODIGOS_FIJOS[claveTipo]) cuentas[codigo] = cuentaPorCodigo(codigo);
  if (tipo.etiquetaCargo) {
    const lista = getCuentasCache();
    cuentas.cargo = lista.find((c) => c.id === $('ret-cargo').value);
    cuentas.contra = lista.find((c) => c.id === $('ret-contra').value);
    if (!cuentas.cargo || !cuentas.contra) return aviso('Selecciona las dos cuentas de la operacion.');
    if (cuentas.cargo.id === cuentas.contra.id) return aviso('La cuenta de la operacion y la de pago/cobro deben ser distintas.');
  }

  if (base < tipo.minimo) {
    cont.innerHTML = `
      <div class="p-3 rounded-lg border text-sm text-slate-600 bg-slate-50 border-slate-200">
        No aplica retencion: la operacion (${formatMoney(base)}) es menor que ${formatMoney(tipo.minimo)}, el monto minimo que establece el ${tipo.ley}.
        Registrala como una compra/venta normal en el Libro Diario.
      </div>`;
    return;
  }

  const retencion = round2(base * tipo.tasa);
  const movimientos = tipo.movimientos(base, retencion, cuentas).filter((m) => m.debe || m.haber);
  const totalDebe = round2(movimientos.reduce((s, m) => s + m.debe, 0));
  const totalHaber = round2(movimientos.reduce((s, m) => s + m.haber, 0));

  ultimoCalculo = {
    fecha: $('ret-fecha').value,
    concepto: tipo.concepto(base),
    movimientos: movimientos.map((m) => ({ cuentaId: m.cuenta.id, debe: m.debe, haber: m.haber })),
  };

  const filas = movimientos
    .map(
      (m) => `
        <tr class="border-b border-slate-100">
          <td class="px-3 py-1.5 text-sm ${m.haber ? 'pl-8' : ''}">${m.cuenta.codigo} - ${m.cuenta.nombre}</td>
          <td class="px-3 py-1.5 text-sm text-right font-mono">${m.debe ? formatMoney(m.debe) : ''}</td>
          <td class="px-3 py-1.5 text-sm text-right font-mono">${m.haber ? formatMoney(m.haber) : ''}</td>
        </tr>`
    )
    .join('');

  cont.innerHTML = `
    <div class="p-3 rounded-lg border text-sm font-medium text-indigo-700 bg-indigo-50 border-indigo-200 mb-3">
      Calculo: ${(tipo.tasa * 100).toLocaleString('es-SV')} % de ${formatMoney(base)} = ${formatMoney(retencion)}
    </div>
    <p class="text-xs text-slate-500 mb-1">Partida que se registrara en el Libro Diario:</p>
    <p class="text-sm text-slate-700 mb-2">${ultimoCalculo.concepto}</p>
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-3 py-1.5 text-left text-xs font-semibold text-slate-500">Cuenta</th>
            <th class="px-3 py-1.5 text-right text-xs font-semibold text-slate-500">Debe</th>
            <th class="px-3 py-1.5 text-right text-xs font-semibold text-slate-500">Haber</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
        <tfoot class="bg-slate-50 font-semibold">
          <tr>
            <td class="px-3 py-1.5 text-sm">Totales</td>
            <td class="px-3 py-1.5 text-sm text-right font-mono">${formatMoney(totalDebe)}</td>
            <td class="px-3 py-1.5 text-sm text-right font-mono">${formatMoney(totalHaber)}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;

  $('btn-ret-registrar').disabled = totalDebe !== totalHaber;
}

async function registrarRetencion() {
  if (!ultimoCalculo) return;
  const btn = $('btn-ret-registrar');
  btn.disabled = true;
  try {
    await registrarPartida(ultimoCalculo);
    toast('Partida de retencion registrada en el Libro Diario.', 'exito');
    $('ret-base').value = '';
    invalidarCalculo();
  } catch (err) {
    btn.disabled = false;
    toast(`No se pudo registrar la retencion: ${err.message}`, 'error');
  }
}

// -----------------------------------------------------------------------
// Resumen: saldos acumulados de las cuentas de retencion
// -----------------------------------------------------------------------

const RESUMEN = [
  { codigo: '2104', detalle: 'IVA retenido a proveedores, a enterar en el F-07' },
  { codigo: '1106', detalle: 'IVA que nos retuvieron, se descuenta del IVA a pagar en el F-07' },
  { codigo: '2105', detalle: 'Renta retenida por servicios, a enterar en el F-14' },
  { codigo: '2106', detalle: 'Pago a cuenta del mes, a enterar en el F-14' },
  { codigo: '1107', detalle: 'Pagos a cuenta acumulados, se descuentan del ISR anual' },
];

function renderResumen() {
  const cont = $('ret-resumen');
  const filas = RESUMEN.map((r) => ({ ...r, cuenta: cuentaPorCodigo(r.codigo) })).filter((r) => r.cuenta);

  if (!filas.length) {
    cont.innerHTML = '<p class="text-sm text-slate-400">Aun no existen las cuentas de retencion en el catalogo.</p>';
    return;
  }

  cont.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-3 py-1.5 text-left text-xs font-semibold text-slate-500">Cuenta</th>
            <th class="px-3 py-1.5 text-left text-xs font-semibold text-slate-500">Para que sirve</th>
            <th class="px-3 py-1.5 text-right text-xs font-semibold text-slate-500">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${filas
            .map(
              (r) => `
            <tr class="border-b border-slate-100">
              <td class="px-3 py-1.5 text-sm whitespace-nowrap">${r.cuenta.codigo} - ${r.cuenta.nombre}</td>
              <td class="px-3 py-1.5 text-xs text-slate-500">${r.detalle}</td>
              <td class="px-3 py-1.5 text-sm text-right font-mono">${formatMoney(Math.abs(r.cuenta.saldo))}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}
