# App Contable

Aplicacion web de contabilidad. Backend en Node.js + Express, base de datos en Firebase (Firestore).

## Estado del proyecto

Esqueleto inicial: estructura de carpetas, servidor Express, conexion a Firebase Admin SDK y configuracion de repositorio Git/GitHub para control de actividades. La logica de negocio (transacciones, cuentas, reportes, etc.) se ira agregando en los siguientes pasos.

## Estructura del proyecto

```
app-contable/
├── src/
│   ├── config/        # Configuracion (Firebase, etc.)
│   ├── controllers/   # Logica de cada endpoint
│   ├── middlewares/   # Middlewares personalizados (auth, validaciones, etc.)
│   ├── models/        # Definicion de estructuras de datos
│   ├── routes/        # Definicion de rutas de la API
│   ├── services/       # Logica de negocio / acceso a datos
│   └── server.js      # Punto de entrada de la aplicacion
├── .env.example        # Plantilla de variables de entorno
├── .gitignore
├── package.json
└── README.md
```

## Requisitos previos

- Node.js 18+
- Un proyecto de Firebase con Firestore habilitado
- Credenciales de Service Account de Firebase (Firebase Console > Configuracion del proyecto > Cuentas de servicio > Generar nueva clave privada)

## Configuracion

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar el archivo de variables de entorno y completarlo con tus credenciales de Firebase:

   ```bash
   cp .env.example .env
   ```

3. Levantar el servidor en modo desarrollo:

   ```bash
   npm run dev
   ```

4. Probar que responde:

   ```bash
   curl http://localhost:3000/health
   ```

## Control de versiones

Este proyecto usa Git y GitHub para el control de actividades del desarrollo. Cada avance se sube mediante commits descriptivos y, cuando aplique, mediante Pull Requests.
