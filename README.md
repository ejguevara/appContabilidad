# App Contable

Aplicación web de contabilidad para El Salvador. Incluye Libro Diario, Plan de
Cuentas y Libro Mayor, Kardex de inventario, Cierre e Impuestos (liquidación de
IVA 13 %), Reportes Financieros (Balance de Comprobación, Estado de Resultados y
Balance General) y un Dashboard con KPIs y gráficos.

**Tecnologías:**

| Capa | Tecnología |
|---|---|
| Frontend | HTML, Tailwind CSS, JavaScript (módulos ES), Chart.js |
| Backend | Node.js + Express (API REST) |
| Base de datos | PostgreSQL (local) |
| Autenticación | Correo + contraseña, con contraseñas cifradas (bcrypt) y sesiones con JWT |

---

## 1. Roles y accesos

La aplicación maneja por ahora **un solo rol**: el usuario autenticado. Todo
usuario que se registra e inicia sesión tiene acceso completo a todos los
módulos.

| Rol | Cómo se obtiene | Módulos a los que tiene acceso | Permisos |
|---|---|---|---|
| **Usuario autenticado** | Registrarse con correo y contraseña e iniciar sesión | Dashboard, Libro Diario, Plan de Cuentas / Libro Mayor, Kardex, Cierre e Impuestos, Reportes | **Acceso total:** consultar, registrar, editar y anular partidas; crear, editar y eliminar cuentas; registrar movimientos de Kardex; generar la partida de cierre de IVA; ver todos los reportes. |

Quien no ha iniciado sesión no tiene ningún rol: solo ve la pantalla de acceso
(registrarse o iniciar sesión) y no puede ver ni modificar datos contables.

Cómo se aplica:

- Todas las rutas de la API bajo `/api` (excepto `/api/auth/registro` y
  `/api/auth/login`) exigen un token de sesión válido. Si no lo hay, la API
  responde `401 Debes iniciar sesión`. Ver `src/middlewares/auth.js`.
- La sesión dura **7 días**. Después hay que volver a iniciar sesión.
- La contraseña debe tener **al menos 6 caracteres** y se guarda cifrada con
  bcrypt. Nunca se guarda en texto plano.

---

## 2. Manual de instalación

### 2.1 Requisitos previos

Instala en tu computadora:

| Programa | Versión recomendada | Descarga |
|---|---|---|
| Node.js | 18 o superior | https://nodejs.org |
| PostgreSQL | 14 o superior | https://www.postgresql.org/download/ |
| Git | cualquiera | https://git-scm.com |

Al instalar PostgreSQL, el instalador te pide una **contraseña para el usuario
`postgres`**. Anótala, porque la necesitas en el paso 2.4.

### 2.2 Clonar el repositorio

```bash
git clone <URL-del-repositorio>
cd appContabilidad
```

### 2.3 Crear la base de datos

Crea una base de datos vacía llamada `app_contable`. Puedes hacerlo de
cualquiera de estas formas:

**Opción A: pgAdmin (gráfico).** Abre pgAdmin, conéctate al servidor, da clic
derecho en **Databases > Create > Database...**, escribe `app_contable` y guarda.

**Opción B: terminal.**

```bash
createdb -U postgres app_contable
```

> Si la terminal dice que no encuentra `createdb`, usa la ruta completa:
> - macOS: `/Library/PostgreSQL/<versión>/bin/createdb -U postgres app_contable`
> - Windows: `"C:\Program Files\PostgreSQL\<versión>\bin\createdb.exe" -U postgres app_contable`

### 2.4 Configurar las credenciales (`.env`)

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

En Windows, con `copy .env.example .env`.

Abre `.env` y pon tu contraseña de PostgreSQL y una clave secreta:

```env
PORT=3000
PGHOST=localhost
PGPORT=5432
PGDATABASE=app_contable
PGUSER=postgres
PGPASSWORD=tu_contrasena_de_postgres
JWT_SECRET=cualquier_texto_largo_y_secreto
```

El archivo `.env` **no se sube a GitHub** (está en `.gitignore`). Cada
integrante tiene el suyo con sus propias credenciales.

### 2.5 Instalar dependencias

```bash
npm install
```

### 2.6 Crear las tablas y cargar los datos de prueba

```bash
npm run migrate
```

Este comando ejecuta `schema.sql` (crea las tablas) y `data.sql` (carga el
catálogo de cuentas y las partidas y el kardex de ejemplo de agosto 2026). Si
todo sale bien verás:

```
✅ Migracion completada: esquema creado y datos de prueba cargados.
```

> ⚠️ **Corre `npm run migrate` una sola vez.** Si lo corres de nuevo, las
> partidas, movimientos y registros de kardex se duplican. Para empezar de cero
> sin perder tu usuario:
>
> ```bash
> node src/scripts/reset.js
> npm run migrate
> ```

### 2.7 Iniciar la aplicación

```bash
npm run dev
```

Debe aparecer:

```
Conexion a PostgreSQL inicializada correctamente.
Servidor corriendo en http://localhost:3000
```

Abre **http://localhost:3000** en el navegador. Deja la terminal abierta
mientras usas la app. Para detenerla presiona `Ctrl + C`.

> `npm run dev` reinicia el servidor solo cada vez que cambias un archivo (útil
> al programar). Para correrla sin eso usa `npm start`.

### 2.8 Primer acceso

La base de datos no trae usuarios precargados. La primera vez:

1. En la pantalla de acceso, da clic en el enlace para **crear una cuenta**.
2. Escribe un correo y una contraseña (mínimo 6 caracteres).
3. Entrarás directamente a la app, con los datos de prueba ya cargados.

Las siguientes veces, solo inicia sesión con ese mismo correo y contraseña.

> Cada integrante tiene **su propia base de datos local**. Los datos y usuarios
> que registres en tu computadora no aparecen en la de los demás.

### 2.9 Problemas comunes

| Mensaje / síntoma | Causa | Solución |
|---|---|---|
| `Faltan variables de entorno de PostgreSQL: ...` | No existe `.env` o le faltan valores | Revisa el paso 2.4. |
| `password authentication failed for user "postgres"` | Contraseña incorrecta en `.env` | Pon la contraseña que elegiste al instalar PostgreSQL. |
| `database "app_contable" does not exist` | No se creó la base | Revisa el paso 2.3. |
| `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL no está encendido | Inícialo desde pgAdmin o desde los servicios del sistema. |
| `EADDRINUSE: address already in use :::3000` | Ya hay otra instancia de la app abierta | Cierra la otra terminal o cambia `PORT` en `.env`. |
| Partidas o movimientos repetidos | Se corrió `npm run migrate` más de una vez | `node src/scripts/reset.js` y luego `npm run migrate`. |
| `Sesion invalida o expirada` | Pasaron 7 días o cambió `JWT_SECRET` | Vuelve a iniciar sesión. |

---

## 3. Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia la app y la reinicia sola al guardar cambios |
| `npm start` | Inicia la app (sin reinicio automático) |
| `npm run migrate` | Crea las tablas y carga los datos de prueba (solo una vez) |
| `node src/scripts/reset.js` | Vacía cuentas, partidas, movimientos y kardex (conserva los usuarios) |

---

## 4. Módulos de la aplicación

| Módulo | Qué hace |
|---|---|
| **Dashboard** | KPIs principales y gráficos de ventas vs. costos, gastos y estructura del activo. |
| **Libro Diario** | Registro de partidas dobles. Valida que Debe = Haber antes de guardar. Incluye calculadora de IVA 13 %. Permite anular partidas. |
| **Plan de Cuentas / Mayor** | Catálogo de cuentas y Libro Mayor de cada cuenta (movimientos ordenados por fecha). |
| **Kardex** | Entradas y salidas de inventario con el método de Costo Promedio Ponderado. |
| **Cierre e Impuestos** | Liquidación de IVA (Débito Fiscal − Crédito Fiscal) y generación automática de la partida de cierre. |
| **Reportes** | Balance de Comprobación, Estado de Resultados y Balance General, generados automáticamente según el código de cada cuenta. |

### Codificación del catálogo de cuentas

Los reportes clasifican las cuentas según el **primer dígito del código**:

| Dígito | Grupo | Se usa en |
|---|---|---|
| 1 | Activo | Balance General |
| 2 | Pasivo | Balance General |
| 3 | Capital | Balance General |
| 4 | Costos y Gastos | Estado de Resultados |
| 5 | Ingresos | Estado de Resultados |

Si agregas cuentas nuevas, respeta esta codificación para que aparezcan en el
reporte correcto.

---

## 5. Estructura del proyecto

```
appContabilidad/
├── schema.sql               # Definición de las tablas de PostgreSQL
├── data.sql                 # Catálogo de cuentas + datos de prueba
├── .env.example             # Plantilla de configuración (copiar a .env)
├── package.json
├── src/                     # Backend (Node.js + Express)
│   ├── server.js            # Punto de entrada: sirve la API y el frontend
│   ├── config/db.js         # Conexión a PostgreSQL
│   ├── middlewares/auth.js  # Verificación de sesión (JWT)
│   ├── routes/              # Endpoints de la API
│   │   ├── auth.js          #   /api/auth         registro e inicio de sesión
│   │   ├── cuentas.js       #   /api/cuentas      plan de cuentas
│   │   ├── partidas.js      #   /api/partidas     libro diario
│   │   ├── movimientos.js   #   /api/movimientos  libro mayor
│   │   └── kardex.js        #   /api/kardex       inventario
│   ├── scripts/
│   │   ├── migrate.js       # npm run migrate
│   │   └── reset.js         # vaciar tablas
│   └── utils/contabilidad.js
└── public/                  # Frontend (lo sirve el mismo servidor)
    ├── index.html
    ├── css/styles.css
    └── js/                  # Un archivo por módulo (diario.js, kardex.js, reportes.js, ...)
```

---

## 6. Modelo de datos

| Tabla | Contenido |
|---|---|
| `usuarios` | Correo y contraseña cifrada de cada usuario. |
| `cuentas` | Catálogo de cuentas: código, nombre, tipo, saldo y sumas de Debe/Haber. |
| `partidas` | Encabezado de cada partida del Libro Diario: fecha, concepto, totales y estado (activa/anulada). |
| `movimientos` | Cada línea (cuenta, Debe, Haber) de cada partida. Se usa para el Libro Mayor. |
| `kardex` | Entradas y salidas de inventario con existencias, costo unitario y saldo. |

El detalle completo de columnas y restricciones está en `schema.sql`.
