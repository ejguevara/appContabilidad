// api.js
// Cliente HTTP hacia la API REST (reemplaza a firebaseConfig.js). Guarda el
// JWT en localStorage y lo manda en cada peticion.

const TOKEN_KEY = 'app_contable_token';
const USER_KEY = 'app_contable_usuario';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsuario() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

export function guardarSesion(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch(ruta, opciones = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(opciones.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(`/api${ruta}`, { ...opciones, headers });

  if (resp.status === 204) return null;

  let data = null;
  try {
    data = await resp.json();
  } catch (e) {
    // sin cuerpo (por ejemplo en errores de red)
  }

  if (!resp.ok) {
    if (resp.status === 401) {
      cerrarSesion();
      document.dispatchEvent(new CustomEvent('auth:sesion-expirada'));
    }
    throw new Error((data && data.error) || `Error ${resp.status}`);
  }

  return data;
}
