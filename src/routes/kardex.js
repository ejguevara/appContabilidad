// src/routes/kardex.js
// Kardex de inventario, Costo Promedio Ponderado.

const express = require('express');
const { getPool } = require('../config/db');
const { round2 } = require('../utils/contabilidad');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await getPool().query('SELECT * FROM kardex ORDER BY fecha ASC, creado_en ASC');
    res.json(rows.map(mapKardex));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { fecha, asientoId, concepto, entrada, salida, costoUnitarioEntrada } = req.body;
    const pool = getPool();

    const { rows: ultimoRows } = await pool.query('SELECT * FROM kardex ORDER BY creado_en DESC LIMIT 1');
    const anterior = ultimoRows[0];
    const existenciasAnt = anterior ? Number(anterior.existencias) : 0;
    const costoAnt = anterior ? Number(anterior.costo_unitario) : 0;

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
        return res.status(400).json({ error: `No hay existencias suficientes. Existencias actuales: ${existenciasAnt}` });
      }
      nuevasExistencias = existenciasAnt - cantSalida;
      nuevoCosto = costoAnt;
      acreedor = round2(cantSalida * costoAnt);
    } else {
      return res.status(400).json({ error: 'Debes indicar una cantidad de entrada o de salida.' });
    }

    const saldo = round2(nuevasExistencias * nuevoCosto);

    const { rows } = await pool.query(
      `INSERT INTO kardex (fecha, asiento_id, concepto, entrada, salida, existencias, costo_unitario, deudor, acreedor, saldo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [fecha, asientoId || null, concepto, cantEntrada, cantSalida, round2(nuevasExistencias), nuevoCosto, deudor, acreedor, saldo]
    );
    res.status(201).json(mapKardex(rows[0]));
  } catch (err) {
    next(err);
  }
});

function mapKardex(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    asientoId: row.asiento_id,
    concepto: row.concepto,
    entrada: Number(row.entrada),
    salida: Number(row.salida),
    existencias: Number(row.existencias),
    costoUnitario: Number(row.costo_unitario),
    deudor: Number(row.deudor),
    acreedor: Number(row.acreedor),
    saldo: Number(row.saldo),
  };
}

module.exports = router;
