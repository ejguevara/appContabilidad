# App Contable — Frontend (HTML + Tailwind CSS + JavaScript + Firebase Firestore)

Aplicacion web contable interactiva para El Salvador: Libro Diario, Plan de
Cuentas y Libro Mayor, Kardex de inventario, Cierre e Impuestos (liquidacion
de IVA 13%) y Reportes Financieros (Balance de Comprobacion, Estado de
Resultados y Balance General), con un Dashboard de KPIs y graficos
(Chart.js). Todos los datos se guardan y se sincronizan en tiempo real en
Firebase Firestore.

Este frontend es independiente del backend Node.js/Express que ya esta en
`../src` (ese backend usa Firebase Admin SDK del lado servidor). El frontend
habla directamente con Firestore usando el SDK de cliente de Firebase, sin
pasar por el backend — es la forma recomendada para una app con
lectura/escritura en tiempo real como esta. Puedes mantener el backend para
futuras funciones que requieran logica de servidor (por ejemplo, generar
reportes en PDF, integraciones externas, autenticacion avanzada, etc.).

## 1. Crear el proyecto de Firebase

1. Ve a https://console.firebase.google.com/ y crea un proyecto nuevo (o usa uno existente).
2. Dentro del proyecto, ve a **Compilacion > Firestore Database** y crea la base de datos:
   - Elige la region mas cercana (ej. `us-central` o `southamerica-east1`).
   - Para empezar rapido puedes iniciar en "modo de prueba" (test mode); luego aplica las reglas de `firestore.rules` incluidas en esta carpeta.
3. Ve a **Configuracion del proyecto** (icono de engranaje) > pestaña **General** > seccion **Tus apps** > agrega una app **Web** (icono `</>`).
4. Copia el objeto `firebaseConfig` que te muestra Firebase y pegalo en `js/firebaseConfig.js`, reemplazando los valores de ejemplo (`TU_API_KEY`, etc.).

## 2. Aplicar las reglas de seguridad de Firestore

En la consola de Firebase, ve a **Firestore Database > Reglas** y pega el contenido de `firestore.rules` (o usa Firebase CLI: `firebase deploy --only firestore:rules`). Las reglas incluidas permiten lectura/escritura abierta para que puedas probar la app de inmediato; el archivo explica como restringirlas con autenticacion cuando quieras subir el proyecto a produccion.

## 3. Ejecutar la aplicacion

Esta es una app 100% estatica (HTML/CSS/JS, sin build ni npm), pero los navegadores bloquean los `import` de modulos ES si abres el `index.html` directamente con `file://`. Debes servirla con un servidor local simple. Opciones:

**Con la extension "Live Server" de VS Code (mas facil):**
Clic derecho sobre `index.html` > "Open with Live Server".

**Con Node.js (ya lo tienes instalado por el backend):**
```bash
npx serve frontend
```

**Con Python (si lo tienes instalado):**
```bash
cd frontend
python -m http.server 5500
```

Luego abre `http://localhost:5500` (o el puerto que indique) en tu navegador.

## 4. Primeros pasos dentro de la app

1. Entra a la pestaña **Plan de Cuentas / Mayor** y da clic en **"Cargar plan de cuentas base de ejemplo"** para tener un catalogo inicial (Caja, Bancos, IVA Debito/Credito Fiscal, Ventas, Compras, etc.), o crea tus propias cuentas manualmente.
2. Ve a **Libro Diario** y registra tus partidas. El formulario valida automaticamente que Debe = Haber antes de dejarte guardar. Usa el boton **"Calcular IVA (13%)"** para sacar rapido la base/IVA/total de una compra o venta.
3. En **Kardex**, registra entradas y salidas de inventario; el costo unitario se calcula con el metodo de **Costo Promedio Ponderado**.
4. En **Cierre e Impuestos**, selecciona tus cuentas de IVA Debito Fiscal, IVA Credito Fiscal y la cuenta de liquidacion (IVA por Pagar o Credito Fiscal a Favor) y genera la partida de cierre del periodo con un clic.
5. En **Reportes**, revisa el Balance de Comprobacion (se arma solo, con las sumas y saldos de cada cuenta), completa Inventario Inicial/Final para generar el Estado de Resultados, y revisa el Balance General y si la ecuacion contable cuadra.
6. En el **Dashboard**, visualiza tus KPIs principales y los graficos de ventas/costos, gastos y estructura del activo.

## 5. Estructura de archivos

```
frontend/
├── index.html              # Layout de toda la app (una sola pagina, con pestanas)
├── css/
│   └── styles.css          # Estilos puntuales que complementan Tailwind
├── js/
│   ├── firebaseConfig.js   # Configuracion e inicializacion de Firebase (EDITAR AQUI)
│   ├── db.js                # Toda la logica de acceso a Firestore (CRUD, transacciones)
│   ├── utils.js              # Helpers: formato de moneda/fecha, calculo de IVA, naturaleza de cuentas
│   ├── cuentas.js            # Modulo: Plan de Cuentas + Libro Mayor
│   ├── diario.js             # Modulo: Libro Diario (partida doble, cuadre, calculadora IVA)
│   ├── kardex.js              # Modulo: Kardex (costo promedio ponderado)
│   ├── cierre.js              # Modulo: Cierre e Impuestos (liquidacion de IVA)
│   ├── reportes.js            # Modulo: Balance de Comprobacion, Estado de Resultados, Balance General
│   ├── dashboard.js            # Modulo: KPIs + graficos Chart.js
│   └── app.js                  # Punto de entrada: navegacion entre pestanas e inicializacion
└── firestore.rules            # Reglas de seguridad sugeridas para Firestore
```

## 6. Modelo de datos en Firestore

- **`cuentas`**: `{ codigo, nombre, tipo, saldo, sumaDebe, sumaHaber }` — `sumaDebe`/`sumaHaber` son campos adicionales (no pedidos explicitamente, pero necesarios) para poder armar el Balance de Comprobacion sin tener que recalcular sumando todos los movimientos cada vez.
- **`partidas`**: `{ fecha, concepto, movimientos: [{ cuentaId, debe, haber }], totalDebe, totalHaber, estado }`.
- **`movimientos`**: coleccion derivada (una entrada por cada linea de cada partida) que permite consultar el Libro Mayor de una cuenta especifica de forma eficiente (`where('cuentaId', '==', ...)`), sin tener que recorrer todas las partidas.
- **`kardex`**: `{ fecha, asientoId, concepto, entrada, salida, existencias, costoUnitario, deudor, acreedor, saldo }`, tal como se definio en los requerimientos.

## 7. Notas importantes / limitaciones conocidas

- El calculo de saldos usa `increment()` de Firestore de forma atomica (via `writeBatch`), por lo que es seguro ante varias partidas guardandose casi al mismo tiempo.
- El Kardex, en cambio, lee el "ultimo registro" antes de escribir el siguiente; en un uso academico/individual esto es suficiente, pero si varias personas registran kardex **exactamente** al mismo tiempo podria haber una condicion de carrera. Para produccion real se recomendaria mover ese calculo a una Cloud Function con transaccion.
- El Estado de Resultados identifica las cuentas de "Ventas", "Compras" y "Costo de Venta" buscando esas palabras en el nombre de la cuenta. Si usas nombres distintos en tu catalogo, ajusta la busqueda en `reportes.js` (funcion `buscarCuentaPorNombre`) o renombra tus cuentas para que coincidan.
- No se implemento autenticacion de usuarios todavia (cualquiera con la URL de tu Firebase puede leer/escribir, segun las reglas de ejemplo). Si vas a compartir el proyecto con tu equipo o presentarlo, se recomienda agregar Firebase Authentication.
