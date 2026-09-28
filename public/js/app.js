// app.js
// Punto de entrada de la aplicacion: autenticacion, navegacion entre
// modulos (tabs) e inicializacion de cada uno.

import { initAuth } from './auth.js';
import { initDocumentos, asegurarDocumentoActivo } from './documentos.js';
import { initCuentas } from './cuentas.js';
import { initDiario } from './diario.js';
import { initKardex } from './kardex.js';
import { initReportes } from './reportes.js';
import { initExportar } from './exportar.js';
import { initDashboard } from './dashboard.js';

const TABS = ['dashboard', 'diario', 'cuentas', 'kardex', 'reportes'];

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
      btn.classList.toggle('bg-amber-500', t === tab);
      btn.classList.toggle('text-stone-950', t === tab);
      btn.classList.toggle('font-semibold', t === tab);
      btn.classList.toggle('text-stone-300', t !== tab);
      btn.classList.toggle('hover:bg-stone-800', t !== tab);
    }
  });
}

let appYaInicializada = false;

async function initApp() {
  if (appYaInicializada) return; // por si onAuthStateChanged dispara mas de una vez
  appYaInicializada = true;

  initNavegacion();

  // Antes de cargar cualquier dato hay que saber en que documento (archivo
  // de contabilidad independiente) se va a trabajar.
  await asegurarDocumentoActivo();
  initDocumentos();

  // El orden importa: cuentas primero, porque los demas modulos dependen
  // de getCuentasCache() y del buscador de cuentas.
  initCuentas();
  initDiario();
  initKardex();
  initReportes();
  initExportar();
  initDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
  // La app solo arranca cuando hay una sesion de Firebase Auth activa.
  // Mientras tanto, auth.js muestra la pantalla de login/registro.
  initAuth(initApp);
});
