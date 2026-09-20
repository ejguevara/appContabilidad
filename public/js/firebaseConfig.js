// firebaseConfig.js
// -----------------------------------------------------------------------
// Configuracion e inicializacion de Firebase (SDK modular v10, via CDN).
//
// IMPORTANTE: estas claves (apiKey, etc.) son publicas por diseno en apps
// web de Firebase; la seguridad real la dan las Reglas de Seguridad de
// Firestore y de Auth (ver README.md), no ocultar este archivo.
//
// NOTA: los imports deben venir de la URL de gstatic.com (CDN), no de
// especificadores tipo "firebase/app" — esos solo funcionan con un
// bundler (Vite, webpack, etc.), y esta app corre como HTML/JS plano
// directo en el navegador, sin bundler.
// -----------------------------------------------------------------------

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getFirestore,
  connectFirestoreEmulator,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBQepyJDGRl-jk-4jtGrnfbPUej2zHHcgU',
  authDomain: 'contabilidad-app-ad610.firebaseapp.com',
  projectId: 'contabilidad-app-ad610',
  storageBucket: 'contabilidad-app-ad610.firebasestorage.app',
  messagingSenderId: '405002063838',
  appId: '1:405002063838:web:05e5b9806b27f056e1d74f',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

// Descomenta esta linea si quieres desarrollar contra el emulador local
// de Firestore (firebase emulators:start) en vez del proyecto real:
// connectFirestoreEmulator(db, 'localhost', 8080);
