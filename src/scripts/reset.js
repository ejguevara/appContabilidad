// src/scripts/reset.js
// Vacia todas las tablas (para poder correr "npm run migrate" de nuevo sin
// duplicar partidas/movimientos/kardex). NO borra la tabla de usuarios,
// para no tener que volver a registrarte.
//
// Uso: node src/scripts/reset.js

require('dotenv').config();
const { initDb, getPool } = require('../config/db');

async function main() {
  initDb();
  const pool = getPool();
  try {
    console.log('Vaciando tablas (excepto usuarios)...');
    await pool.query('TRUNCATE kardex, movimientos, partidas, cuentas RESTART IDENTITY CASCADE');
    console.log('✅ Listo. Corre "npm run migrate" para volver a cargar el catalogo y los datos de prueba.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
