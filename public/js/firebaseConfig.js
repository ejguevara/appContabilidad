// firebaseConfig.js
// -----------------------------------------------------------------------
// Configuracion e inicializacion de Firebase (SDK modular v10, via CDN).
// Reemplaza los valores de "firebaseConfig" con los de TU proyecto de
// Firebase: Firebase Console > Configuracion del proyecto > Tus apps >
// SDK setup and configuration > Config.
//
// IMPORTANTE: estas claves (apiKey, etc.) son publicas por diseno en apps
// web de Firebase; la seguridad real la dan las Reglas de Seguridad de
// Firestore (ver README.md), no ocultar este archivo.
// -----------------------------------------------------------------------

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

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

// Descomenta estas dos lineas si quieres desarrollar contra el
// emulador local de Firestore (firebase emulators:start) en vez del
// proyecto real:
// connectFirestoreEmulator(db, 'localhost', 8080);
