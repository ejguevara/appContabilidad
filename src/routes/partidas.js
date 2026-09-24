// src/routes/partidas.js
// Libro Diario: registrar y anular partidas dobles, de forma atomica con
// una transaccion de Postgres (equivalente al writeBatch de Firestore).

const express = require('express');
const { getPool } = require('../config/db');
const { efectoSaldo, round2 } = require('../utils/contabilidad');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await getPool().query(`
      SELECT p.*, COALESCE(json_agg(json_build_object(
        'cuentaId', m.cuenta_id, 'debe', m.debe, 'haber', m.haber
      )) FILTER (WHERE m.id IS NOT NULL), '[]') AS movimientos
      FROM partidas p
      LEFT JOIN movimientos m ON m.partida_id = p.id
      GROUP BY p.id
      ORDER BY p.fecha DESC, p.creado_en DESC
    `);
    res.json(rows.map(mapPartida));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { fecha, concepto, movimientos } = req.body;
  if (!fecha || !concepto || !Array.isArray(movimientos) || !movimientos.length) {
    return res.status(400).json({ error: 'fecha, concepto y movimientos son obligatorios.' });
  }

  const totalDebe = round2(movimientos.reduce((s, m) => s + (Number(m.debe) || 0), 0));
  const totalHaber = round2(movimientos.reduce((s, m) => s + (Number(m.haber) || 0), 0));
  if (totalDebe !== totalHaber) {
    return res.status(400).json({ error: `La partida no cuadra: Debe ${totalDebe} distinto de Haber ${totalHaber}` });
  }
  if (totalDebe === 0) {
    return res.status(400).json({ error: 'La partida no puede tener montos en cero.' });
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: cuentasRows } = await client.query(
      'SELECT id, tipo FROM cuentas WHERE id = ANY($1::uuid[])',
      [movimientos.map((m) => m.cuentaId)]
    );
    const cuentasMap = new Map(cuentasRows.map((c) => [c.id, c]));
    if (cuentasMap.size !== new Set(movimientos.map((m) => m.cuentaId)).size) {
      throw Object.assign(new Error('Una de las cuentas seleccionadas ya no existe.'), { status: 400 });
    }

    const { rows: partidaRows } = await client.query(
      'INSERT INTO partidas (fecha, concepto, total_debe, total_haber) VALUES ($1, $2, $3, $4) RETURNING id',
      [fecha, concepto, totalDebe, totalHaber]
    );
    const partidaId = partidaRows[0].id;

    for (const m of movimientos) {
      const debe = round2(Number(m.debe) || 0);
      const haber = round2(Number(m.haber) || 0);
      await client.query(
        'INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber) VALUES ($1, $2, $3, $4, $5, $6)',
        [partidaId, m.cuentaId, fecha, concepto, debe, haber]
      );
      const cuenta = cuentasMap.get(m.cuentaId);
      const delta = efectoSaldo(cuenta.tipo, debe, haber);
      await client.query(
        'UPDATE cuentas SET saldo = saldo + $1, suma_debe = suma_debe + $2, suma_haber = suma_haber + $3 WHERE id = $4',
        [delta, debe, haber, m.cuentaId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: partidaId });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  } finally {
    client.release();
  }
});

router.post('/:id/anular', async (req, res, next) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: partidaRows } = await client.query('SELECT * FROM partidas WHERE id = $1 FOR UPDATE', [
      req.params.id,
    ]);
    if (!partidaRows.length) throw Object.assign(new Error('La partida no existe.'), { status: 404 });
    const partida = partidaRows[0];
    if (partida.estado === 'anulada') {
      throw Object.assign(new Error('Esta partida ya esta anulada.'), { status: 400 });
    }

    const { rows: movRows } = await client.query('SELECT * FROM movimientos WHERE partida_id = $1', [
      req.params.id,
    ]);
    const cuentaIds = movRows.map((m) => m.cuenta_id);
    const { rows: cuentasRows } = await client.query('SELECT id, tipo FROM cuentas WHERE id = ANY($1::uuid[])', [
      cuentaIds,
    ]);
    const cuentasMap = new Map(cuentasRows.map((c) => [c.id, c]));

    await client.query("UPDATE partidas SET estado = 'anulada' WHERE id = $1", [req.params.id]);
    await client.query("UPDATE movimientos SET estado = 'anulada' WHERE partida_id = $1", [req.params.id]);

    for (const m of movRows) {
      const cuenta = cuentasMap.get(m.cuenta_id);
      if (!cuenta) continue;
      const delta = -efectoSaldo(cuenta.tipo, m.debe, m.haber);
      await client.query(
        'UPDATE cuentas SET saldo = saldo + $1, suma_debe = suma_debe - $2, suma_haber = suma_haber - $3 WHERE id = $4',
        [delta, m.debe, m.haber, m.cuenta_id]
      );
    }

    await client.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  } finally {
    client.release();
  }
});

function mapPartida(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    concepto: row.concepto,
    totalDebe: Number(row.total_debe),
    totalHaber: Number(row.total_haber),
    estado: row.estado,
    movimientos: row.movimientos,
  };
}

module.exports = router;
