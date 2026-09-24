// db.js
// Capa de acceso a datos: toda la comunicacion con Firestore vive aqui.
// Los modulos (diario.js, cuentas.js, kardex.js, cierre.js, reportes.js,
// dashboard.js) importan estas funciones en vez de usar Firestore
// directamente, para mantener una sola fuente de verdad del esquema.

import { db } from './firebaseConfig.js';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  increment,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { naturalezaCuenta, efectoSaldo, round2 } from './utils.js';

// ---------------------------------------------------------------------
// CUENTAS (Plan de Cuentas)
// ---------------------------------------------------------------------

const colCuentas = () => collection(db, 'cuentas');

export function escucharCuentas(callback) {
  const q = query(colCuentas(), orderBy('codigo'));
  return onSnapshot(q, (snap) => {
    const cuentas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(cuentas);
  });
}

export async function obtenerCuentas() {
  const snap = await getDocs(query(colCuentas(), orderBy('codigo')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function crearCuenta({ codigo, nombre, tipo }) {
  return addDoc(colCuentas(), {
    codigo,
    nombre,
    tipo, // 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso'
    saldo: 0,
    sumaDebe: 0,
    sumaHaber: 0,
    creadoEn: Timestamp.now(),
  });
}

export async function actualizarCuenta(id, cambios) {
  return updateDoc(doc(db, 'cuentas', id), cambios);
}

export async function eliminarCuenta(id) {
  return deleteDoc(doc(db, 'cuentas', id));
}

/**
 * Carga un catalogo de cuentas base tipico de una empresa comercial salvadorena.
 * Codificado segun la guia de la catedra: 1=Activo, 2=Pasivo, 3=Capital,
 * 4=Costos y Gastos, 5=Ingresos (los Reportes clasifican por este digito).
 */
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
  const batch = writeBatch(db);
  base.forEach((cuenta) => {
    const ref = doc(colCuentas());
    batch.set(ref, { ...cuenta, saldo: 0, sumaDebe: 0, sumaHaber: 0, creadoEn: Timestamp.now() });
  });
  await batch.commit();
}

// ---------------------------------------------------------------------
// PARTIDAS (Libro Diario) + MOVIMIENTOS (detalle para Libro Mayor)
// ---------------------------------------------------------------------

const colPartidas = () => collection(db, 'partidas');
const colMovimientos = () => collection(db, 'movimientos');

export function escucharPartidas(callback) {
  const q = query(colPartidas(), orderBy('fecha', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Registra una partida doble de forma atomica:
 * 1. Crea el documento en "partidas".
 * 2. Crea un documento en "movimientos" por cada linea (para el Libro Mayor).
 * 3. Actualiza el saldo, sumaDebe y sumaHaber de cada cuenta afectada.
 *
 * Se asume que el llamador ya valido Debe === Haber (validarCuadre en diario.js),
 * pero se vuelve a validar aqui como ultima linea de defensa.
 */
export async function registrarPartida({ fecha, concepto, movimientos }) {
  const totalDebe = round2(movimientos.reduce((s, m) => s + (Number(m.debe) || 0), 0));
  const totalHaber = round2(movimientos.reduce((s, m) => s + (Number(m.haber) || 0), 0));
  if (totalDebe !== totalHaber) {
    throw new Error(`La partida no cuadra: Debe ${totalDebe} distinto de Haber ${totalHaber}`);
  }
  if (totalDebe === 0) {
    throw new Error('La partida no puede tener montos en cero.');
  }

  // Se necesita el tipo/naturaleza de cada cuenta para actualizar su saldo.
  const cuentasCache = new Map();
  for (const m of movimientos) {
    if (!cuentasCache.has(m.cuentaId)) {
      const snap = await getDoc(doc(db, 'cuentas', m.cuentaId));
      if (!snap.exists()) throw new Error('Una de las cuentas seleccionadas ya no existe.');
      cuentasCache.set(m.cuentaId, snap.data());
    }
  }

  const batch = writeBatch(db);
  const fechaTs = Timestamp.fromDate(new Date(fecha));

  const partidaRef = doc(colPartidas());
  batch.set(partidaRef, {
    fecha: fechaTs,
    concepto,
    movimientos: movimientos.map((m) => ({
      cuentaId: m.cuentaId,
      debe: round2(Number(m.debe) || 0),
      haber: round2(Number(m.haber) || 0),
    })),
    totalDebe,
    totalHaber,
    estado: 'activa',
    creadoEn: Timestamp.now(),
  });

  movimientos.forEach((m) => {
    const movRef = doc(colMovimientos());
    batch.set(movRef, {
      partidaId: partidaRef.id,
      cuentaId: m.cuentaId,
      fecha: fechaTs,
      concepto,
      debe: round2(Number(m.debe) || 0),
      haber: round2(Number(m.haber) || 0),
      estado: 'activa',
    });

    const cuenta = cuentasCache.get(m.cuentaId);
    const delta = efectoSaldo(cuenta.tipo, m.debe, m.haber);
    batch.update(doc(db, 'cuentas', m.cuentaId), {
      saldo: increment(delta),
      sumaDebe: increment(round2(Number(m.debe) || 0)),
      sumaHaber: increment(round2(Number(m.haber) || 0)),
    });
  });

  await batch.commit();
  return partidaRef.id;
}

/** Anula una partida: revierte su efecto en los saldos de las cuentas afectadas. */
export async function anularPartida(partidaId) {
  const partidaSnap = await getDoc(doc(db, 'partidas', partidaId));
  if (!partidaSnap.exists()) throw new Error('La partida no existe.');
  const partida = partidaSnap.data();
  if (partida.estado === 'anulada') throw new Error('Esta partida ya esta anulada.');

  const cuentasCache = new Map();
  for (const m of partida.movimientos) {
    if (!cuentasCache.has(m.cuentaId)) {
      const snap = await getDoc(doc(db, 'cuentas', m.cuentaId));
      if (snap.exists()) cuentasCache.set(m.cuentaId, snap.data());
    }
  }

  const movsSnap = await getDocs(query(colMovimientos(), where('partidaId', '==', partidaId)));

  const batch = writeBatch(db);
  batch.update(doc(db, 'partidas', partidaId), { estado: 'anulada' });
  movsSnap.docs.forEach((d) => batch.update(d.ref, { estado: 'anulada' }));

  partida.movimientos.forEach((m) => {
    const cuenta = cuentasCache.get(m.cuentaId);
    if (!cuenta) return;
    // Efecto inverso al original para revertir el saldo.
    const delta = -efectoSaldo(cuenta.tipo, m.debe, m.haber);
    batch.update(doc(db, 'cuentas', m.cuentaId), {
      saldo: increment(delta),
      sumaDebe: increment(-round2(Number(m.debe) || 0)),
      sumaHaber: increment(-round2(Number(m.haber) || 0)),
    });
  });

  await batch.commit();
}

/**
 * Trae los movimientos (Libro Mayor) de una cuenta especifica, ordenados
 * por fecha. Se filtra por una sola condicion de igualdad en la consulta
 * a Firestore (cuentaId) y el resto (estado activa + orden por fecha) se
 * hace en el navegador, para no depender de un indice compuesto en
 * Firestore (una consulta con dos "where" + un "orderBy" en un campo
 * distinto exige crear ese indice manualmente en la consola de Firebase).
 */
export async function obtenerMovimientosPorCuenta(cuentaId) {
  const q = query(colMovimientos(), where('cuentaId', '==', cuentaId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((m) => m.estado === 'activa')
    .sort((a, b) => aFechaMs(a.fecha) - aFechaMs(b.fecha));
}

function aFechaMs(fecha) {
  if (fecha && typeof fecha.toMillis === 'function') return fecha.toMillis();
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export async function obtenerTodosLosMovimientosActivos() {
  const q = query(colMovimientos(), where('estado', '==', 'activa'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------------------------------------------------------------------
// KARDEX (Inventario)
// ---------------------------------------------------------------------

const colKardex = () => collection(db, 'kardex');

export function escucharKardex(callback) {
  const q = query(colKardex(), orderBy('fecha', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Trae el ultimo registro de kardex (para conocer existencias y costo
 * unitario actuales). Se ordena por "creadoEn" (el momento real en que
 * se guardo el registro) en vez de por "fecha" (que el usuario puede
 * escribir libremente y no siempre coincide con el orden de captura) —
 * ademas, usar un solo campo de orden evita tener que crear un indice
 * compuesto en Firestore.
 */
export async function obtenerUltimoKardex() {
  const q = query(colKardex(), orderBy('creadoEn', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Registra un movimiento de kardex usando el metodo de Costo Promedio
 * Ponderado (el mas usado en El Salvador para efectos de valuacion de
 * inventarios y declaracion de renta).
 *
 * - Entrada: existencias += cantidad; costoUnitario ponderado se recalcula.
 * - Salida: existencias -= cantidad; costoUnitario NO cambia (se usa el
 *   promedio vigente); se valida que haya existencias suficientes.
 */
export async function registrarKardex({ fecha, asientoId, concepto, entrada, salida, costoUnitarioEntrada }) {
  const anterior = await obtenerUltimoKardex();
  const existenciasAnt = anterior?.existencias ?? 0;
  const costoAnt = anterior?.costoUnitario ?? 0;

  const cantEntrada = Number(entrada) || 0;
  const cantSalida = Number(salida) || 0;

  let nuevasExistencias;
  let nuevoCosto;
  let deudor = 0;
  let acreedor = 0;

  if (cantEntrada > 0) {
    const costoEntrada = Number(costoUnitarioEntrada) || 0;
    const valorAnterior = existenciasAnt * costoAnt;
    const valorEntrada = cantEntrada * costoEntrada;
    nuevasExistencias = existenciasAnt + cantEntrada;
    nuevoCosto = nuevasExistencias > 0 ? round2((valorAnterior + valorEntrada) / nuevasExistencias) : 0;
    deudor = round2(valorEntrada);
  } else if (cantSalida > 0) {
    if (cantSalida > existenciasAnt) {
      throw new Error(`No hay existencias suficientes. Existencias actuales: ${existenciasAnt}`);
    }
    nuevasExistencias = existenciasAnt - cantSalida;
    nuevoCosto = costoAnt;
    acreedor = round2(cantSalida * costoAnt);
  } else {
    throw new Error('Debes indicar una cantidad de entrada o de salida.');
  }

  const saldo = round2(nuevasExistencias * nuevoCosto);

  await addDoc(colKardex(), {
    fecha: Timestamp.fromDate(new Date(fecha)),
    asientoId: asientoId || '',
    concepto,
    entrada: cantEntrada,
    salida: cantSalida,
    existencias: round2(nuevasExistencias),
    costoUnitario: nuevoCosto,
    deudor,
    acreedor,
    saldo,
    creadoEn: Timestamp.now(),
  });
}

export { naturalezaCuenta };
