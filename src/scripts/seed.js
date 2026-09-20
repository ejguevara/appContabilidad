// src/scripts/seed.js
// -----------------------------------------------------------------------
// Datos de prueba: un mes completo de operaciones (agosto) para poder ver
// el Dashboard y los Reportes con numeros reales sin tener que capturar
// todo a mano.
//
// Usa el Firebase Admin SDK (las credenciales de tu .env), asi que no
// depende de que exista un usuario logueado ni de las reglas de
// Firestore del lado del cliente.
//
// ADVERTENCIA: este script BORRA todo lo que haya en las colecciones
// "cuentas", "partidas", "movimientos" y "kardex" antes de insertar los
// datos de prueba (para no duplicar cuentas si ya habias probado la app
// a mano). Usalo solo en un proyecto de desarrollo/pruebas, nunca en
// datos reales que quieras conservar.
//
// Uso: npm run seed
// -----------------------------------------------------------------------

require('dotenv').config();
const { initFirebase, getFirestore, admin } = require('../config/firebase');

initFirebase();
const db = getFirestore();
const increment = admin.firestore.FieldValue.increment;

function naturaleza(tipo) {
  return tipo === 'activo' || tipo === 'egreso' ? 'deudora' : 'acreedora';
}
function efecto(tipo, debe, haber) {
  return naturaleza(tipo) === 'deudora' ? debe - haber : haber - debe;
}
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function formatMoney(n) {
  return `$${round2(n).toFixed(2)}`;
}

// -----------------------------------------------------------------------
// Datos del escenario: una comercializadora pequeña, un mes de agosto
// (compras y ventas de mercaderia, todas con IVA 13%, cierre de IVA al
// final del mes). Inventario Inicial: $2,000 (200 unidades a $10 c/u).
// -----------------------------------------------------------------------

const CUENTAS_BASE = [
  { codigo: '1101', nombre: 'Caja General', tipo: 'activo' },
  { codigo: '1102', nombre: 'Bancos', tipo: 'activo' },
  { codigo: '1103', nombre: 'Clientes', tipo: 'activo' },
  { codigo: '1104', nombre: 'IVA Credito Fiscal', tipo: 'activo' },
  { codigo: '1105', nombre: 'Inventario de Mercaderias', tipo: 'activo' },
  { codigo: '2101', nombre: 'Proveedores', tipo: 'pasivo' },
  { codigo: '2102', nombre: 'IVA Debito Fiscal', tipo: 'pasivo' },
  { codigo: '2103', nombre: 'IVA por Pagar', tipo: 'pasivo' },
  { codigo: '2104', nombre: 'Retenciones por Pagar', tipo: 'pasivo' },
  { codigo: '3101', nombre: 'Capital Social', tipo: 'patrimonio' },
  { codigo: '3102', nombre: 'Utilidades Retenidas', tipo: 'patrimonio' },
  { codigo: '4101', nombre: 'Ventas', tipo: 'ingreso' },
  { codigo: '5101', nombre: 'Compras', tipo: 'egreso' },
  { codigo: '5102', nombre: 'Costo de Ventas', tipo: 'egreso' },
  { codigo: '6101', nombre: 'Gastos de Venta', tipo: 'egreso' },
  { codigo: '6102', nombre: 'Gastos de Administracion', tipo: 'egreso' },
];

const PARTIDAS = [
  {
    fecha: '2026-08-01',
    concepto: 'Aportacion de capital de los socios',
    movimientos: [
      { codigo: '1102', debe: 8000, haber: 0 },
      { codigo: '1105', debe: 2000, haber: 0 },
      { codigo: '3101', debe: 0, haber: 10000 },
    ],
  },
  {
    fecha: '2026-08-03',
    concepto: 'Compra de mercaderia al credito',
    movimientos: [
      { codigo: '5101', debe: 5000, haber: 0 },
      { codigo: '1104', debe: 650, haber: 0 },
      { codigo: '2101', debe: 0, haber: 5650 },
    ],
  },
  {
    fecha: '2026-08-05',
    concepto: 'Venta de mercaderia al contado',
    movimientos: [
      { codigo: '1101', debe: 9040, haber: 0 },
      { codigo: '4101', debe: 0, haber: 8000 },
      { codigo: '2102', debe: 0, haber: 1040 },
    ],
  },
  {
    fecha: '2026-08-08',
    concepto: 'Pago parcial a proveedores',
    movimientos: [
      { codigo: '2101', debe: 3000, haber: 0 },
      { codigo: '1102', debe: 0, haber: 3000 },
    ],
  },
  {
    fecha: '2026-08-10',
    concepto: 'Venta de mercaderia al credito',
    movimientos: [
      { codigo: '1103', debe: 4520, haber: 0 },
      { codigo: '4101', debe: 0, haber: 4000 },
      { codigo: '2102', debe: 0, haber: 520 },
    ],
  },
  {
    fecha: '2026-08-15',
    concepto: 'Cobro a clientes',
    movimientos: [
      { codigo: '1101', debe: 4520, haber: 0 },
      { codigo: '1103', debe: 0, haber: 4520 },
    ],
  },
  {
    fecha: '2026-08-18',
    concepto: 'Compra de mercaderia al contado',
    movimientos: [
      { codigo: '5101', debe: 2000, haber: 0 },
      { codigo: '1104', debe: 260, haber: 0 },
      { codigo: '1102', debe: 0, haber: 2260 },
    ],
  },
  {
    fecha: '2026-08-20',
    concepto: 'Pago de gastos de venta (publicidad)',
    movimientos: [
      { codigo: '6101', debe: 350, haber: 0 },
      { codigo: '1101', debe: 0, haber: 350 },
    ],
  },
  {
    fecha: '2026-08-22',
    concepto: 'Pago de gastos de administracion (planilla y alquiler)',
    movimientos: [
      { codigo: '6102', debe: 1200, haber: 0 },
      { codigo: '1101', debe: 0, haber: 1200 },
    ],
  },
  {
    fecha: '2026-08-25',
    concepto: 'Venta de mercaderia al contado',
    movimientos: [
      { codigo: '1101', debe: 7345, haber: 0 },
      { codigo: '4101', debe: 0, haber: 6500 },
      { codigo: '2102', debe: 0, haber: 845 },
    ],
  },
  {
    fecha: '2026-08-28',
    concepto: 'Venta de mercaderia al contado',
    movimientos: [
      { codigo: '1101', debe: 2034, haber: 0 },
      { codigo: '4101', debe: 0, haber: 1800 },
      { codigo: '2102', debe: 0, haber: 234 },
    ],
  },
  {
    fecha: '2026-08-30',
    concepto: 'Liquidacion de IVA del periodo - IVA por Pagar',
    movimientos: [
      { codigo: '2102', debe: 2639, haber: 0 },
      { codigo: '1104', debe: 0, haber: 910 },
      { codigo: '2103', debe: 0, haber: 1729 },
    ],
  },
];

const KARDEX = [
  { fecha: '2026-08-01', concepto: 'Inventario inicial', entrada: 200, salida: 0, costoUnitarioEntrada: 10 },
  { fecha: '2026-08-03', concepto: 'Compra de mercaderia al credito', entrada: 500, salida: 0, costoUnitarioEntrada: 10 },
  { fecha: '2026-08-05', concepto: 'Venta de mercaderia al contado', entrada: 0, salida: 300 },
  { fecha: '2026-08-10', concepto: 'Venta de mercaderia al credito', entrada: 0, salida: 150 },
  { fecha: '2026-08-18', concepto: 'Compra de mercaderia al contado', entrada: 200, salida: 0, costoUnitarioEntrada: 10 },
  { fecha: '2026-08-25', concepto: 'Venta de mercaderia al contado', entrada: 0, salida: 350 },
  { fecha: '2026-08-28', concepto: 'Venta de mercaderia al contado', entrada: 0, salida: 80 },
];

// -----------------------------------------------------------------------

async function limpiarColeccion(nombre) {
  const snap = await db.collection(nombre).get();
  if (snap.empty) {
    console.log(`  "${nombre}": ya estaba vacia.`);
    return;
  }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`  "${nombre}": ${snap.size} documento(s) eliminado(s).`);
}

async function seed() {
  console.log('Limpiando colecciones existentes...');
  await limpiarColeccion('movimientos');
  await limpiarColeccion('partidas');
  await limpiarColeccion('kardex');
  await limpiarColeccion('cuentas');

  console.log('\nCreando plan de cuentas...');
  const cuentas = {}; // codigo -> { id, tipo }
  for (const c of CUENTAS_BASE) {
    const ref = db.collection('cuentas').doc();
    await ref.set({
      codigo: c.codigo,
      nombre: c.nombre,
      tipo: c.tipo,
      saldo: 0,
      sumaDebe: 0,
      sumaHaber: 0,
      creadoEn: new Date(),
    });
    cuentas[c.codigo] = { id: ref.id, tipo: c.tipo };
  }
  console.log(`  ${CUENTAS_BASE.length} cuentas creadas.`);

  console.log('\nRegistrando partidas del Libro Diario...');
  for (const p of PARTIDAS) {
    const totalDebe = round2(p.movimientos.reduce((s, m) => s + m.debe, 0));
    const totalHaber = round2(p.movimientos.reduce((s, m) => s + m.haber, 0));
    if (totalDebe !== totalHaber) {
      throw new Error(`La partida "${p.concepto}" no cuadra: Debe ${totalDebe} vs Haber ${totalHaber}`);
    }

    const batch = db.batch();
    const partidaRef = db.collection('partidas').doc();
    const fecha = new Date(p.fecha);

    batch.set(partidaRef, {
      fecha,
      concepto: p.concepto,
      movimientos: p.movimientos.map((m) => ({
        cuentaId: cuentas[m.codigo].id,
        debe: m.debe,
        haber: m.haber,
      })),
      totalDebe,
      totalHaber,
      estado: 'activa',
      creadoEn: new Date(),
    });

    p.movimientos.forEach((m) => {
      const cuenta = cuentas[m.codigo];
      const movRef = db.collection('movimientos').doc();
      batch.set(movRef, {
        partidaId: partidaRef.id,
        cuentaId: cuenta.id,
        fecha,
        concepto: p.concepto,
        debe: m.debe,
        haber: m.haber,
        estado: 'activa',
      });
      const delta = efecto(cuenta.tipo, m.debe, m.haber);
      batch.update(db.collection('cuentas').doc(cuenta.id), {
        saldo: increment(delta),
        sumaDebe: increment(round2(m.debe)),
        sumaHaber: increment(round2(m.haber)),
      });
    });

    await batch.commit();
    console.log(`  - ${p.fecha}: ${p.concepto} (${formatMoney(totalDebe)})`);
  }

  console.log('\nRegistrando movimientos de Kardex (costo promedio ponderado)...');
  let existenciasAnt = 0;
  let costoAnt = 0;
  for (const k of KARDEX) {
    let nuevasExistencias;
    let nuevoCosto;
    let deudor = 0;
    let acreedor = 0;

    if (k.entrada > 0) {
      const valorAnterior = existenciasAnt * costoAnt;
      const valorEntrada = k.entrada * k.costoUnitarioEntrada;
      nuevasExistencias = existenciasAnt + k.entrada;
      nuevoCosto = nuevasExistencias > 0 ? round2((valorAnterior + valorEntrada) / nuevasExistencias) : 0;
      deudor = round2(valorEntrada);
    } else {
      if (k.salida > existenciasAnt) {
        throw new Error(`Kardex "${k.concepto}": no hay existencias suficientes (${existenciasAnt} disponibles).`);
      }
      nuevasExistencias = existenciasAnt - k.salida;
      nuevoCosto = costoAnt;
      acreedor = round2(k.salida * costoAnt);
    }

    const saldo = round2(nuevasExistencias * nuevoCosto);

    await db.collection('kardex').add({
      fecha: new Date(k.fecha),
      asientoId: '',
      concepto: k.concepto,
      entrada: k.entrada || 0,
      salida: k.salida || 0,
      existencias: round2(nuevasExistencias),
      costoUnitario: nuevoCosto,
      deudor,
      acreedor,
      saldo,
      creadoEn: new Date(),
    });

    existenciasAnt = nuevasExistencias;
    costoAnt = nuevoCosto;
    console.log(`  - ${k.fecha}: ${k.concepto} (existencias: ${nuevasExistencias}, saldo: ${formatMoney(saldo)})`);
  }

  console.log('\n✅ Datos de prueba cargados correctamente.\n');
  console.log('En la pestaña Reportes > Estado de Resultados, usa:');
  console.log(`  Inventario Inicial: $2,000.00`);
  console.log(`  Inventario Final:   ${formatMoney(existenciasAnt * costoAnt)}`);
  console.log('\nDeberias ver: Ventas $20,300 · Compras $7,000 · IVA por Pagar $1,729.00\n');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Error al sembrar datos de prueba:', err.message);
    process.exit(1);
  });
