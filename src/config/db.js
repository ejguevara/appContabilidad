// src/config/db.js
// Conexion a PostgreSQL (reemplaza src/config/firebase.js).

const { Pool } = require('pg');

let pool = null;

function initDb() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    pool = new Pool({ connectionString });
  } else {
    const faltantes = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'].filter((k) => !process.env[k]);
    if (faltantes.length) {
      throw new Error(`Faltan variables de entorno de PostgreSQL: ${faltantes.join(', ')}`);
    }
    pool = new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
    });
  }

  return pool;
}

function getPool() {
  if (!pool) throw new Error('La base de datos no ha sido inicializada. Llama initDb() primero.');
  return pool;
}

module.exports = { initDb, getPool };
