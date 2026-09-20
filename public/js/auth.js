// auth.js
// Modulo: Autenticacion (Firebase Auth, email/contraseña).
// Regla del negocio: cualquier usuario que inicie sesion puede usar toda
// la app por igual (no hay roles todavia). Este modulo solo se encarga
// de mostrar la pantalla de login/registro y de arrancar el resto de la
// app (initApp) una vez que hay una sesion activa.

import { auth } from './firebaseConfig.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { toast } from './utils.js';

let modoRegistro = false;

/**
 * Punto de entrada del modulo de autenticacion.
 * @param {(user: import('https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js').User) => void} onLogin
 *   Se llama una vez, la primera vez que hay un usuario autenticado.
 */
export function initAuth(onLogin) {
  const form = document.getElementById('form-auth');
  const btnToggle = document.getElementById('auth-toggle-modo');
  const btnLogout = document.getElementById('btn-logout');
  const userEmailEl = document.getElementById('auth-user-email');

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
      if (modoRegistro) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast('Cuenta creada correctamente.', 'exito');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      toast(traducirErrorAuth(err.code), 'error');
    } finally {
      btnSubmit.disabled = false;
    }
  });

  btnLogout.addEventListener('click', async () => {
    await signOut(auth);
  });

  let yaArranco = false;
  onAuthStateChanged(auth, (user) => {
    const pantallaLogin = document.getElementById('pantalla-login');
    const appShell = document.getElementById('app-shell');

    if (user) {
      pantallaLogin.classList.add('hidden');
      appShell.classList.remove('hidden');
      userEmailEl.textContent = user.email;
      if (!yaArranco) {
        yaArranco = true;
        onLogin(user);
      }
    } else {
      pantallaLogin.classList.remove('hidden');
      appShell.classList.add('hidden');
    }
  });
}

function actualizarTextosFormulario() {
  document.getElementById('auth-titulo').textContent = modoRegistro ? 'Crear cuenta' : 'Iniciar sesion';
  document.getElementById('auth-submit').textContent = modoRegistro ? 'Crear cuenta' : 'Entrar';
  document.getElementById('auth-toggle-modo').textContent = modoRegistro
    ? '¿Ya tienes cuenta? Inicia sesion'
    : '¿No tienes cuenta? Crea una';
}

function traducirErrorAuth(code) {
  const mensajes = {
    'auth/invalid-email': 'El correo no es valido.',
    'auth/user-disabled': 'Esta cuenta esta deshabilitada.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  };
  return mensajes[code] || `Error de autenticacion (${code || 'desconocido'})`;
}
