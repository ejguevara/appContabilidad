// src/routes/movimientos.js
// Libro Mayor: movimientos de una cuenta especifica, y el listado completo
// (usado por el Dashboard para graficar Ventas vs Costo de Ventas por mes).

const express = require('express');
const { getPool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { cuentaId } = req.query;
    const pool = getPool();

    if (cuentaId) {
      const { rows } = await pool.query(
        "SELECT * FROM movimientos WHERE cuenta_id = $1 AND estado = 'activa' ORDER BY fecha ASC",
        [cuentaId]
      );
      return res.json(rows.map(mapMovimiento));
    }

    const { rows } = await pool.query("SELECT * FROM movimientos WHERE estado = 'activa'");
    res.json(rows.map(mapMovimiento));
  } catch (err) {
    next(err);
  }
});

function mapMovimiento(row) {
  return {
    id: row.id,
    partidaId: row.partida_id,
    cuentaId: row.cuenta_id,
    fecha: row.fecha,
    concepto: row.concepto,
    debe: Number(row.debe),
    haber: Number(row.haber),
    estado: row.estado,
  };
}

module.exports = router;
