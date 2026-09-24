// src/routes/auth.js
// Registro / login con email + contrasena, usando bcrypt + JWT.
// Reemplaza a Firebase Authentication.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

const router = express.Router();

function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, email: usuario.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/registro', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contrasena son obligatorios.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres.' });
    }

    const pool = getPool();
    const existente = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (existente.rows.length) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO usuarios (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase(), hash]
    );
    const usuario = rows[0];
    res.status(201).json({ token: firmarToken(usuario), usuario });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contrasena son obligatorios.' });
    }

    const pool = getPool();
    const { rows } = await pool.query('SELECT id, email, password_hash FROM usuarios WHERE email = $1', [
      email.toLowerCase(),
    ]);
    const usuario = rows[0];
    if (!usuario) {
      return res.status(401).json({ error: 'Correo o contrasena incorrectos.' });
    }

    const ok = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Correo o contrasena incorrectos.' });
    }

    res.json({ token: firmarToken(usuario), usuario: { id: usuario.id, email: usuario.email } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
