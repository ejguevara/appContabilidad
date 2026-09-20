/**
 * Configuracion e inicializacion de Firebase Admin SDK.
 *
 * Se espera que las credenciales del Service Account de Firebase
 * se provean via variables de entorno (ver .env.example) para no
 * subir el archivo de credenciales al repositorio.
 */

const admin = require('firebase-admin');

function buildServiceAccount() {
  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error(
      'Faltan variables de entorno de Firebase. Revisa FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en tu archivo .env'
    );
  }

  return {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    // Las claves privadas en variables de entorno suelen traer los saltos
    // de linea escapados como "\n"; hay que restaurarlos.
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

let firebaseApp;

function initFirebase() {
  if (firebaseApp) return firebaseApp;

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(buildServiceAccount()),
  });

  return firebaseApp;
}

function getFirestore() {
  initFirebase();
  return admin.firestore();
}

module.exports = {
  admin,
  initFirebase,
  getFirestore,
};
