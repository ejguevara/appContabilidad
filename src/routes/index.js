// src/routes/index.js
// Punto de entrada de la API REST bajo /api.
// Todo requiere estar autenticado (JWT), excepto /api/auth/*.

const express = require('express');
const { requireAuth } = require('../middlewares/auth');

const authRoutes = require('./auth');
const cuentasRoutes = require('./cuentas');
const partidasRoutes = require('./partidas');
const movimientosRoutes = require('./movimientos');
const kardexRoutes = require('./kardex');

const router = express.Router();

router.use('/auth', authRoutes);

router.use('/cuentas', requireAuth, cuentasRoutes);
router.use('/partidas', requireAuth, partidasRoutes);
router.use('/movimientos', requireAuth, movimientosRoutes);
router.use('/kardex', requireAuth, kardexRoutes);

module.exports = router;
