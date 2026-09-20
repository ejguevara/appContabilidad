const { Router } = require('express');

const router = Router();

// Punto de entrada de la API. Aqui se iran montando los modulos
// del sistema contable (transacciones, cuentas, usuarios, reportes, etc.)
// segun se definan en los proximos pasos del proyecto.
router.get('/', (req, res) => {
  res.json({ message: 'API de la aplicacion contable funcionando.' });
});

module.exports = router;
