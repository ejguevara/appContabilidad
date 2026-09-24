// src/routes/cuentas.js
// Plan de Cuentas (CRUD). Protegido por requireAuth en routes/index.js.

const express = require('express');
const { getPool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await getPool().query('SELECT * FROM cuentas ORDER BY codigo');
    res.json(rows.map(mapCuenta));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { codigo, nombre, tipo } = req.body;
    if (!codigo || !nombre || !tipo) {
      return res.status(400).json({ error: 'codigo, nombre y tipo son obligatorios.' });
    }
    const { rows } = await getPool().query(
      'INSERT INTO cuentas (codigo, nombre, tipo) VALUES ($1, $2, $3) RETURNING *',
      [codigo, nombre, tipo]
    );
    res.status(201).json(mapCuenta(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con ese codigo.' });
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { nombre, tipo } = req.body;
    const { rows } = await getPool().query(
      'UPDATE cuentas SET nombre = COALESCE($1, nombre), tipo = COALESCE($2, tipo) WHERE id = $3 RETURNING *',
      [nombre || null, tipo || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cuenta no encontrada.' });
    res.json(mapCuenta(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await getPool().query('SELECT saldo FROM cuentas WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cuenta no encontrada.' });
    if (Number(rows[0].saldo) !== 0) {
      return res.status(400).json({ error: 'No puedes eliminar una cuenta con saldo distinto de cero.' });
    }
    await getPool().query('DELETE FROM cuentas WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function mapCuenta(row) {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    tipo: row.tipo,
    saldo: Number(row.saldo),
    sumaDebe: Number(row.suma_debe),
    sumaHaber: Number(row.suma_haber),
  };
}

module.exports = router;
