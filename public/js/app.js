// app.js
// Punto de entrada de la aplicacion: navegacion entre modulos (tabs) e
// inicializacion de cada uno.

import { initCuentas } from './cuentas.js';
import { initDiario } from './diario.js';
import { initKardex } from './kardex.js';
import { initCierre } from './cierre.js';
import { initReportes } from './reportes.js';
import { initDashboard } from './dashboard.js';

const TABS = ['dashboard', 'diario', 'cuentas', 'kardex', 'cierre', 'reportes'];

function initNavegacion() {
  const botones = document.querySelectorAll('[data-tab-btn]');
  botones.forEach((btn) => {
    btn.addEventListener('click', () => activarTab(btn.dataset.tabBtn));
  });
  activarTab('dashboard');
}

function activarTab(tab) {
  TABS.forEach((t) => {
    document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== tab);
    const btn = document.querySelector(`[data-tab-btn="${t}"]`);
    if (btn) {
      btn.classList.toggle('bg-indigo-600', t === tab);
      btn.classList.toggle('text-white', t === tab);
      btn.classList.toggle('text-slate-600', t !== tab);
      btn.classList.toggle('hover:bg-slate-100', t !== tab);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavegacion();
  // El orden importa: cuentas primero, porque los demas modulos dependen
  // de getCuentasCache() y de los <select data-cuentas-select>.
  initCuentas();
  initDiario();
  initKardex();
  initCierre();
  initReportes();
  initDashboard();
});
