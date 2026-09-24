// auth.js
// Modulo: Autenticacion (email + contrasena contra la API de PostgreSQL,
// JWT guardado en localStorage). Regla del negocio: cualquier usuario que
// inicie sesion puede usar toda la app por igual (no hay roles todavia).
// Este modulo solo se encarga de mostrar la pantalla de login/registro y
// de arrancar el resto de la app (initApp) una vez que hay una sesion activa.

import { apiFetch, getToken, getUsuario, guardarSesion, cerrarSesion } from './api.js';
import { toast } from './utils.js';

let modoRegistro = false;

/**
 * Punto de entrada del modulo de autenticacion.
 * @param {(usuario: { id: string, email: string }) => void} onLogin
 *   Se llama una vez, la primera vez que hay un usuario autenticado.
 */
export function initAuth(onLogin) {
  const form = document.getElementById('form-auth');
  const btnToggle = document.getElementById('auth-toggle-modo');
  const btnLogout = document.getElementById('btn-logout');
  const userEmailEl = document.getElementById('auth-user-email');
  const pantallaLogin = document.getElementById('pantalla-login');
  const appShell = document.getElementById('app-shell');

  actualizarTextosFormulario();

  btnToggle.addEventListener('click', () => {
    modoRegistro = !modoRegistro;
    actualizarTextosFormulario();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const btnSubmit = document.getElementById('auth-submit');

    if (!email || !password) return;
    btnSubmit.disabled = true;

    try {
      const ruta = modoRegistro ? '/auth/registro' : '/auth/login';
      const { token, usuario } = await apiFetch(ruta, { method: 'POST', body: JSON.stringify({ email, password }) });
      guardarSesion(token, usuario);
      if (modoRegistro) toast('Cuenta creada correctamente.', 'exito');
      mostrarApp(usuario, onLogin);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
    }
  });

  btnLogout.addEventListener('click', () => {
    cerrarSesion();
    mostrarLogin();
  });

  document.addEventListener('auth:sesion-expirada', () => {
    toast('Tu sesion expiro. Inicia sesion de nuevo.', 'advertencia');
    mostrarLogin();
  });

  function mostrarApp(usuario, callback) {
    pantallaLogin.classList.add('hidden');
    appShell.classList.remove('hidden');
    userEmailEl.textContent = usuario.email;
    callback(usuario);
  }

  function mostrarLogin() {
    pantallaLogin.classList.remove('hidden');
    appShell.classList.add('hidden');
  }

  // Si ya habia una sesion guardada (token en localStorage), entra directo.
  const tokenGuardado = getToken();
  const usuarioGuardado = getUsuario();
  if (tokenGuardado && usuarioGuardado) {
    mostrarApp(usuarioGuardado, onLogin);
  } else {
    mostrarLogin();
  }
}

function actualizarTextosFormulario() {
  document.getElementById('auth-titulo').textContent = modoRegistro ? 'Crear cuenta' : 'Iniciar sesion';
  document.getElementById('auth-submit').textContent = modoRegistro ? 'Crear cuenta' : 'Entrar';
  document.getElementById('auth-toggle-modo').textContent = modoRegistro
    ? '¿Ya tienes cuenta? Inicia sesion'
    : '¿No tienes cuenta? Crea una';
}
