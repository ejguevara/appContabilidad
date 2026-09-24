// src/middlewares/auth.js
// Middleware de autenticacion con JWT (reemplaza la verificacion de sesion
// de Firebase Auth). Cualquier usuario con un token valido tiene acceso
// completo a la app -- no hay roles diferenciados.

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Debes iniciar sesion.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesion invalida o expirada. Inicia sesion de nuevo.' });
  }
}

module.exports = { requireAuth };
