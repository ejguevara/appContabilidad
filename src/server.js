require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { initFirebase } = require('./config/firebase');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares base.
// contentSecurityPolicy se desactiva porque el frontend carga Tailwind,
// Chart.js y el SDK de Firebase desde CDNs externos (cdn.tailwindcss.com,
// cdn.jsdelivr.net, gstatic.com); la CSP por defecto de helmet los bloquearia.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializa Firebase al arrancar (falla rapido si faltan credenciales)
try {
  initFirebase();
  console.log('Firebase inicializado correctamente.');
} catch (err) {
  console.error('No se pudo inicializar Firebase:', err.message);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas de la API
app.use('/api', routes);

// Frontend estatico (Tailwind + JS + Firestore): sirve la carpeta "public"
// (index.html, css/, js/) en la raiz del sitio, ej. http://localhost:3000/
app.use(express.static(path.join(__dirname, '..', 'public')));

// Manejo de rutas no encontradas (solo para las que no son ni /api ni un
// archivo estatico existente en /public)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores centralizado
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Frontend disponible en http://localhost:${PORT}/`);
});

module.exports = app;
