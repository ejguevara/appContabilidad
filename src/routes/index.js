// src/routes/index.js
// Punto de entrada de la API REST bajo /api.
// Todo requiere estar autenticado (JWT), excepto /api/auth/*.

const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { requireDocumento } = require('../middlewares/documento');

const authRoutes = require('./auth');
const documentosRoutes = require('./documentos');
const cuentasRoutes = require('./cuentas');
const partidasRoutes = require('./partidas');
const movimientosRoutes = require('./movimientos');
const kardexRoutes = require('./kardex');

const router = express.Router();

router.use('/auth', authRoutes);

// Documentos no lleva requireDocumento: es la ruta que sirve para elegir o
// crear el documento con el que se va a trabajar.
router.use('/documentos', requireAuth, documentosRoutes);

router.use('/cuentas', requireAuth, requireDocumento, cuentasRoutes);
router.use('/partidas', requireAuth, requireDocumento, partidasRoutes);
router.use('/movimientos', requireAuth, requireDocumento, movimientosRoutes);
router.use('/kardex', requireAuth, requireDocumento, kardexRoutes);

module.exports = router;
