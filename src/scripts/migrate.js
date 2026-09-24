// src/scripts/migrate.js
// Corre schema.sql y data.sql contra la base de datos configurada en .env.
// Alternativa a usar psql directamente desde la terminal.
//
// ADVERTENCIA: data.sql inserta el catalogo de cuentas y las partidas de
// prueba; si ya los habias cargado antes, primero corre limpiar.js o
// borra las tablas manualmente para no duplicar.
//
// Uso: npm run migrate

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initDb, getPool } = require('../config/db');

async function ejecutarArchivo(pool, nombreArchivo) {
  const ruta = path.join(__dirname, '..', '..', nombreArchivo);
  const sql = fs.readFileSync(ruta, 'utf8');
  console.log(`\nEjecutando ${nombreArchivo}...`);
  await pool.query(sql);
  console.log(`  OK.`);
}

async function main() {
  initDb();
  const pool = getPool();
  try {
    await ejecutarArchivo(pool, 'schema.sql');
    await ejecutarArchivo(pool, 'data.sql');
    console.log('\n✅ Migracion completada: esquema creado y datos de prueba cargados.\n');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Error al migrar:', err.message);
  process.exit(1);
});
