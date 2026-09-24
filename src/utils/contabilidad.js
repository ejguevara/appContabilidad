// src/utils/contabilidad.js
// Reglas contables compartidas por las rutas del backend (equivalente a
// public/js/utils.js del lado del cliente).

function naturalezaCuenta(tipo) {
  return tipo === 'activo' || tipo === 'egreso' ? 'deudora' : 'acreedora';
}

function efectoSaldo(tipo, debe, haber) {
  const d = Number(debe) || 0;
  const h = Number(haber) || 0;
  return naturalezaCuenta(tipo) === 'deudora' ? d - h : h - d;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

module.exports = { naturalezaCuenta, efectoSaldo, round2 };
