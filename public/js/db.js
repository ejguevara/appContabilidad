// db.js
// Capa de acceso a datos: reemplaza las llamadas a Firestore por peticiones
// a la API REST (que a su vez habla con PostgreSQL). Se mantienen los
// mismos nombres de funcion que antes para no tener que tocar diario.js,
// cuentas.js, kardex.js, cierre.js, reportes.js ni dashboard.js.

import { apiFetch } from './api.js';
import { naturalezaCuenta } from './utils.js';

// ---------------------------------------------------------------------
// CUENTAS (Plan de Cuentas)
// ---------------------------------------------------------------------

let cuentasListener = null;

export function escucharCuentas(callback) {
  cuentasListener = callback;
  refrescarCuentas();
  return () => {
    cuentasListener = null;
  };
}

async function refrescarCuentas() {
  const cuentas = await apiFetch('/cuentas');
  if (cuentasListener) cuentasListener(cuentas);
  return cuentas;
}

export async function obtenerCuentas() {
  return apiFetch('/cuentas');
}

export async function crearCuenta({ codigo, nombre, tipo }) {
  const cuenta = await apiFetch('/cuentas', { method: 'POST', body: JSON.stringify({ codigo, nombre, tipo }) });
  await refrescarCuentas();
  return cuenta;
}

export async function actualizarCuenta(id, cambios) {
  const cuenta = await apiFetch(`/cuentas/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
  await refrescarCuentas();
  return cuenta;
}

export async function eliminarCuenta(id) {
  await apiFetch(`/cuentas/${id}`, { method: 'DELETE' });
  await refrescarCuentas();
}

/** Carga un catalogo de cuentas base tipico de una empresa comercial salvadorena. */
export async function cargarPlanDeCuentasBase() {
  const base = [
    { codigo: '1101', nombre: 'Caja', tipo: 'activo' },
    { codigo: '1102', nombre: 'Bancos', tipo: 'activo' },
    { codigo: '1103', nombre: 'Clientes', tipo: 'activo' },
    { codigo: '1104', nombre: 'IVA Credito Fiscal', tipo: 'activo' },
    { codigo: '1105', nombre: 'Inventario', tipo: 'activo' },
    { codigo: '2101', nombre: 'Proveedores', tipo: 'pasivo' },
    { codigo: '2102', nombre: 'IVA Debito Fiscal', tipo: 'pasivo' },
    { codigo: '2103', nombre: 'IVA por Pagar', tipo: 'pasivo' },
    { codigo: '3101', nombre: 'Capital Social', tipo: 'patrimonio' },
    { codigo: '4101', nombre: 'Compras', tipo: 'egreso' },
    { codigo: '4102', nombre: 'Costo de Ventas', tipo: 'egreso' },
    { codigo: '4103', nombre: 'Gastos de Venta', tipo: 'egreso' },
    { codigo: '4104', nombre: 'Gastos de Administracion', tipo: 'egreso' },
    { codigo: '5101', nombre: 'Ventas', tipo: 'ingreso' },
  ];
  for (const cuenta of base) {
    await apiFetch('/cuentas', { method: 'POST', body: JSON.stringify(cuenta) }).catch(() => {});
  }
  await refrescarCuentas();
}

// ---------------------------------------------------------------------
// PARTIDAS (Libro Diario) + MOVIMIENTOS (detalle para Libro Mayor)
// ---------------------------------------------------------------------

let partidasListener = null;

export function escucharPartidas(callback) {
  partidasListener = callback;
  refrescarPartidas();
  return () => {
    partidasListener = null;
  };
}

async function refrescarPartidas() {
  const partidas = await apiFetch('/partidas');
  if (partidasListener) partidasListener(partidas);
  return partidas;
}

/**
 * Registra una partida doble. La API valida el cuadre (Debe === Haber) y
 * actualiza el saldo de cada cuenta dentro de una transaccion SQL.
 */
export async function registrarPartida({ fecha, concepto, movimientos }) {
  const { id } = await apiFetch('/partidas', {
    method: 'POST',
    body: JSON.stringify({ fecha, concepto, movimientos }),
  });
  await Promise.all([refrescarPartidas(), refrescarCuentas()]);
  return id;
}

/** Anula una partida: revierte su efecto en los saldos de las cuentas afectadas. */
export async function anularPartida(partidaId) {
  await apiFetch(`/partidas/${partidaId}/anular`, { method: 'POST' });
  await Promise.all([refrescarPartidas(), refrescarCuentas()]);
}

/** Trae los movimientos (Libro Mayor) de una cuenta especifica, ordenados por fecha. */
export async function obtenerMovimientosPorCuenta(cuentaId) {
  return apiFetch(`/movimientos?cuentaId=${encodeURIComponent(cuentaId)}`);
}

export async function obtenerTodosLosMovimientosActivos() {
  return apiFetch('/movimientos');
}

// ---------------------------------------------------------------------
// KARDEX (Inventario)
// ---------------------------------------------------------------------

let kardexListener = null;

export function escucharKardex(callback) {
  kardexListener = callback;
  refrescarKardex();
  return () => {
    kardexListener = null;
  };
}

async function refrescarKardex() {
  const kardex = await apiFetch('/kardex');
  if (kardexListener) kardexListener(kardex);
  return kardex;
}

export async function obtenerUltimoKardex() {
  const todos = await apiFetch('/kardex');
  return todos.length ? todos[todos.length - 1] : null;
}

/**
 * Registra un movimiento de kardex usando el metodo de Costo Promedio
 * Ponderado. El calculo real vive en el backend (src/routes/kardex.js)
 * para que quede consistente sin importar quien lo consulte.
 */
export async function registrarKardex({ fecha, asientoId, concepto, entrada, salida, costoUnitarioEntrada }) {
  await apiFetch('/kardex', {
    method: 'POST',
    body: JSON.stringify({ fecha, asientoId, concepto, entrada, salida, costoUnitarioEntrada }),
  });
  await refrescarKardex();
}

export { naturalezaCuenta };
