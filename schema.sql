-- =========================================================================
-- schema.sql
-- App Contable - Esquema relacional en PostgreSQL
--
-- Reemplaza el modelo de datos que antes vivia en Firestore (colecciones
-- cuentas, partidas, movimientos, kardex) por tablas relacionales.
--
-- Codificacion del catalogo de cuentas segun la guia de la catedra:
--   1 = Activo, 2 = Pasivo, 3 = Capital, 4 = Costos y Gastos, 5 = Ingresos
--
-- Uso:
--   psql -U postgres -d app_contable -f schema.sql
-- =========================================================================

-- Extension para generar UUIDs (mas simple que manejar SERIAL en un
-- proyecto donde el frontend arma sus propios ids de referencia).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- USUARIOS (reemplaza Firebase Authentication)
-- Cualquier usuario autenticado tiene acceso completo a la app (sin roles).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- CUENTAS (Plan de Cuentas)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuentas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      VARCHAR(20) NOT NULL UNIQUE,
  nombre      VARCHAR(150) NOT NULL,
  tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso')),
  saldo       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  suma_debe   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  suma_haber  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuentas_codigo ON cuentas (codigo);

-- -------------------------------------------------------------------------
-- PARTIDAS (Libro Diario) + MOVIMIENTOS (detalle para el Libro Mayor)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha        DATE NOT NULL,
  concepto     VARCHAR(255) NOT NULL,
  total_debe   NUMERIC(14, 2) NOT NULL,
  total_haber  NUMERIC(14, 2) NOT NULL,
  estado       VARCHAR(10) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'anulada')),
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_partida_cuadra CHECK (total_debe = total_haber)
);

CREATE TABLE IF NOT EXISTS movimientos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id  UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  cuenta_id   UUID NOT NULL REFERENCES cuentas(id),
  fecha       DATE NOT NULL,
  concepto    VARCHAR(255),
  debe        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  haber       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  estado      VARCHAR(10) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'anulada'))
);

CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta ON movimientos (cuenta_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_partida ON movimientos (partida_id);

-- -------------------------------------------------------------------------
-- KARDEX (Inventario, Costo Promedio Ponderado)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kardex (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha           DATE NOT NULL,
  asiento_id      UUID REFERENCES partidas(id),
  concepto        VARCHAR(255),
  entrada         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  salida          NUMERIC(14, 2) NOT NULL DEFAULT 0,
  existencias     NUMERIC(14, 2) NOT NULL,
  costo_unitario  NUMERIC(14, 4) NOT NULL,
  deudor          NUMERIC(14, 2) NOT NULL DEFAULT 0,
  acreedor        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  saldo           NUMERIC(14, 2) NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kardex_creado_en ON kardex (creado_en);
