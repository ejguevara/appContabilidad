// src/middlewares/documento.js
// Exige que la peticion indique con que "documento" (archivo de contabilidad
// independiente) quiere trabajar, mandando su id en la cabecera
// X-Documento-Id. Verifica que ese documento exista y sea del usuario
// autenticado (requireAuth debe correr antes que este middleware), y deja
// el id ya validado en req.documentoId para que las rutas de cuentas,
// partidas, movimientos y kardex filtren todo por el.

const { getPool } = require('../config/db');

async function requireDocumento(req, res, next) {
  const documentoId = req.headers['x-documento-id'];
  if (!documentoId) {
    return res.status(400).json({ error: 'Falta indicar el documento (X-Documento-Id).' });
  }

  try {
    const { rows } = await getPool().query('SELECT id FROM documentos WHERE id = $1 AND usuario_id = $2', [
      documentoId,
      req.usuario.id,
    ]);
    if (!rows.length) {
      return res.status(404).json({ error: 'El documento indicado no existe o no es tuyo.' });
    }
    req.documentoId = documentoId;
    next();
  } catch (err) {
    // Un id con formato invalido (no UUID) tira un error de Postgres, no una
    // fila vacia; lo tratamos igual como "documento no encontrado".
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'El id de documento no es valido.' });
    }
    next(err);
  }
}

module.exports = { requireDocumento };
