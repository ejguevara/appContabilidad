// src/routes/documentos.js
// Documentos: archivos de contabilidad independientes (cada uno con su
// propio catalogo de cuentas, Libro Diario y Kardex). Permite crear uno
// nuevo, listarlos (para "Abrir") y renombrarlos (para "Guardar").
//
// No usa requireDocumento porque estas rutas son las que sirven justamente
// para elegir o crear el documento activo; solo necesitan requireAuth
// (montado en routes/index.js).

const express = require('express');
const { getPool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await getPool().query(
      'SELECT * FROM documentos WHERE usuario_id = $1 ORDER BY actualizado_en DESC',
      [req.usuario.id]
    );
    res.json(rows.map(mapDocumento));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'El documento necesita un nombre.' });

    const { rows } = await getPool().query(
      'INSERT INTO documentos (usuario_id, nombre) VALUES ($1, $2) RETURNING *',
      [req.usuario.id, nombre]
    );
    res.status(201).json(mapDocumento(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'El documento necesita un nombre.' });

    const { rows } = await getPool().query(
      `UPDATE documentos SET nombre = $1, actualizado_en = now()
       WHERE id = $2 AND usuario_id = $3 RETURNING *`,
      [nombre, req.params.id, req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'El documento no existe o no es tuyo.' });
    res.json(mapDocumento(rows[0]));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await getPool().query(
      'DELETE FROM documentos WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [req.params.id, req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'El documento no existe o no es tuyo.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function mapDocumento(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

module.exports = router;
