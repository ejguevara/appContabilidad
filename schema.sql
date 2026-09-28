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

-- =========================================================================
-- DOCUMENTOS (archivos de contabilidad independientes: Nuevo / Guardar / Abrir)
--
-- Cada documento es su propio catalogo de cuentas + Libro Diario + Kardex,
-- separado de los demas (antes solo se podia trabajar en uno solo). Este
-- bloque esta escrito para poder correrse sobre una base que YA tenia datos
-- (los de antes de agregar esta funcionalidad): agrega las columnas nuevas
-- como opcionales, les crea un documento por defecto a los datos que ya
-- existian, y hasta entonces las vuelve obligatorias.
-- =========================================================================
CREATE TABLE IF NOT EXISTS documentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre         VARCHAR(150) NOT NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_usuario ON documentos (usuario_id);

ALTER TABLE cuentas     ADD COLUMN IF NOT EXISTS documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE;
ALTER TABLE partidas    ADD COLUMN IF NOT EXISTS documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE;
ALTER TABLE kardex      ADD COLUMN IF NOT EXISTS documento_id UUID REFERENCES documentos(id) ON DELETE CASCADE;

-- Si ya habia cuentas/partidas/movimientos/kardex sin documento asignado
-- (datos de antes de esta funcionalidad), se les crea un documento por
-- defecto ("Documento 1") a nombre del primer usuario registrado, para no
-- perder lo que ya se habia capturado.
DO $$
DECLARE
  primer_usuario UUID;
  doc_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM cuentas WHERE documento_id IS NULL)
     OR EXISTS (SELECT 1 FROM partidas WHERE documento_id IS NULL)
     OR EXISTS (SELECT 1 FROM movimientos WHERE documento_id IS NULL)
     OR EXISTS (SELECT 1 FROM kardex WHERE documento_id IS NULL) THEN

    SELECT id INTO primer_usuario FROM usuarios ORDER BY creado_en ASC LIMIT 1;

    IF primer_usuario IS NOT NULL THEN
      INSERT INTO documentos (usuario_id, nombre) VALUES (primer_usuario, 'Documento 1') RETURNING id INTO doc_id;
      UPDATE cuentas SET documento_id = doc_id WHERE documento_id IS NULL;
      UPDATE partidas SET documento_id = doc_id WHERE documento_id IS NULL;
      UPDATE movimientos SET documento_id = doc_id WHERE documento_id IS NULL;
      UPDATE kardex SET documento_id = doc_id WHERE documento_id IS NULL;
    END IF;
  END IF;
END $$;

-- Ya con todo respaldado en un documento, se puede exigir que la columna
-- siempre venga llena.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cuentas WHERE documento_id IS NULL) THEN
    ALTER TABLE cuentas ALTER COLUMN documento_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM partidas WHERE documento_id IS NULL) THEN
    ALTER TABLE partidas ALTER COLUMN documento_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM movimientos WHERE documento_id IS NULL) THEN
    ALTER TABLE movimientos ALTER COLUMN documento_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM kardex WHERE documento_id IS NULL) THEN
    ALTER TABLE kardex ALTER COLUMN documento_id SET NOT NULL;
  END IF;
END $$;

-- El codigo de cuenta ya no es unico en toda la base, sino unico dentro de
-- cada documento (dos documentos distintos pueden tener ambos la 1101).
ALTER TABLE cuentas DROP CONSTRAINT IF EXISTS cuentas_codigo_key;
DROP INDEX IF EXISTS idx_cuentas_codigo;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cuentas_documento_codigo ON cuentas (documento_id, codigo);

CREATE INDEX IF NOT EXISTS idx_cuentas_documento ON cuentas (documento_id);
CREATE INDEX IF NOT EXISTS idx_partidas_documento ON partidas (documento_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_documento ON movimientos (documento_id);
CREATE INDEX IF NOT EXISTS idx_kardex_documento ON kardex (documento_id);
