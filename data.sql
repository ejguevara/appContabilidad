-- =========================================================================
-- data.sql
-- App Contable - Catalogo de Cuentas + datos de prueba (agosto 2026)
--
-- Codificacion: 1=Activo, 2=Pasivo, 3=Capital, 4=Costos y Gastos, 5=Ingresos
--
-- Estos datos de ejemplo se guardan en un documento aparte llamado
-- "Documento 1", a nombre del primer usuario registrado. Este script es
-- seguro de correr mas de una vez: si ese usuario ya tiene algun documento
-- propio (por ejemplo porque ya trabajaste con la app, o porque ya corriste
-- data.sql antes), no hace nada -- asi no se duplican partidas ni se pierde
-- lo que ya habias capturado.
--
-- Uso (despues de correr schema.sql):
--   psql -U postgres -d app_contable -f data.sql
-- =========================================================================

-- Solo se siembra si ya existe al menos un usuario Y ese usuario todavia no
-- tiene ningun documento propio. _doc_demo queda vacia en cualquier otro
-- caso, y como el resto del script hace CROSS JOIN contra ella, todos los
-- INSERT de aqui en adelante se vuelven no-ops automaticamente.
CREATE TEMP TABLE _sembrar AS
SELECT u.id AS usuario_id
FROM usuarios u
WHERE NOT EXISTS (SELECT 1 FROM documentos d WHERE d.usuario_id = u.id)
ORDER BY u.creado_en ASC
LIMIT 1;

INSERT INTO documentos (usuario_id, nombre)
SELECT usuario_id, 'Documento 1' FROM _sembrar;

CREATE TEMP TABLE _doc_demo AS
SELECT d.id
FROM documentos d
JOIN _sembrar s ON s.usuario_id = d.usuario_id
WHERE d.nombre = 'Documento 1';

-- -------------------------------------------------------------------------
-- Catalogo de Cuentas
-- -------------------------------------------------------------------------
INSERT INTO cuentas (documento_id, codigo, nombre, tipo)
SELECT d.id, v.codigo, v.nombre, v.tipo
FROM _doc_demo d, (VALUES
  ('1101', 'Caja', 'activo'),
  ('1102', 'Bancos', 'activo'),
  ('1103', 'Clientes', 'activo'),
  ('1104', 'IVA Credito Fiscal', 'activo'),
  ('1105', 'Inventario', 'activo'),
  ('1106', 'IVA Retenido por Clientes', 'activo'),
  ('1107', 'Pago a Cuenta de Renta', 'activo'),
  ('2101', 'Proveedores', 'pasivo'),
  ('2102', 'IVA Debito Fiscal', 'pasivo'),
  ('2103', 'IVA por Pagar', 'pasivo'),
  ('2104', 'Retencion de IVA por Pagar', 'pasivo'),
  ('2105', 'Retencion de Renta por Pagar', 'pasivo'),
  ('2106', 'Pago a Cuenta por Pagar', 'pasivo'),
  ('3101', 'Capital Social', 'patrimonio'),
  ('4101', 'Compras', 'egreso'),
  ('4102', 'Costo de Ventas', 'egreso'),
  ('4103', 'Gastos de Venta', 'egreso'),
  ('4104', 'Gastos de Administracion', 'egreso'),
  ('4105', 'Honorarios y Servicios Profesionales', 'egreso'),
  ('5101', 'Ventas', 'ingreso')
) AS v(codigo, nombre, tipo)
ON CONFLICT (documento_id, codigo) DO NOTHING;

-- -------------------------------------------------------------------------
-- Libro Diario: partidas de agosto 2026 (escenario de un mes completo)
-- -------------------------------------------------------------------------

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-01', 'Aportacion de capital de los socios', 10000, 10000 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-01', 'Aportacion de capital de los socios', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('1102', 8000::numeric, 0::numeric), ('1105', 2000, 0), ('3101', 0, 10000)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-03', 'Compra de mercaderia al credito', 5650, 5650 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-03', 'Compra de mercaderia al credito', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('4101', 5000::numeric, 0::numeric), ('1104', 650, 0), ('2101', 0, 5650)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-05', 'Venta de mercaderia al contado', 9040, 9040 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-05', 'Venta de mercaderia al contado', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('1101', 9040::numeric, 0::numeric), ('5101', 0, 8000), ('2102', 0, 1040)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-08', 'Pago parcial a proveedores', 3000, 3000 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-08', 'Pago parcial a proveedores', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('2101', 3000::numeric, 0::numeric), ('1102', 0, 3000)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-10', 'Venta de mercaderia al credito', 4520, 4520 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-10', 'Venta de mercaderia al credito', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('1103', 4520::numeric, 0::numeric), ('5101', 0, 4000), ('2102', 0, 520)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-15', 'Cobro a clientes', 4520, 4520 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-15', 'Cobro a clientes', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('1101', 4520::numeric, 0::numeric), ('1103', 0, 4520)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-18', 'Compra de mercaderia al contado', 2260, 2260 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-18', 'Compra de mercaderia al contado', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('4101', 2000::numeric, 0::numeric), ('1104', 260, 0), ('1102', 0, 2260)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-20', 'Pago de gastos de venta (publicidad)', 350, 350 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-20', 'Pago de gastos de venta (publicidad)', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('4103', 350::numeric, 0::numeric), ('1101', 0, 350)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-22', 'Pago de gastos de administracion (planilla y alquiler)', 1200, 1200 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-22', 'Pago de gastos de administracion (planilla y alquiler)', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('4104', 1200::numeric, 0::numeric), ('1101', 0, 1200)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-25', 'Venta de mercaderia al contado', 7345, 7345 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-25', 'Venta de mercaderia al contado', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('1101', 7345::numeric, 0::numeric), ('5101', 0, 6500), ('2102', 0, 845)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-28', 'Venta de mercaderia al contado', 2034, 2034 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-28', 'Venta de mercaderia al contado', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('1101', 2034::numeric, 0::numeric), ('5101', 0, 1800), ('2102', 0, 234)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

WITH p AS (
  INSERT INTO partidas (documento_id, fecha, concepto, total_debe, total_haber)
  SELECT d.id, '2026-08-30', 'Liquidacion de IVA del periodo - IVA por Pagar', 2639, 2639 FROM _doc_demo d
  RETURNING id, documento_id
)
INSERT INTO movimientos (documento_id, partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.documento_id, p.id, c.id, '2026-08-30', 'Liquidacion de IVA del periodo - IVA por Pagar', v.debe, v.haber
FROM p CROSS JOIN (VALUES ('2102', 2639::numeric, 0::numeric), ('1104', 0, 910), ('2103', 0, 1729)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo AND c.documento_id = p.documento_id;

-- -------------------------------------------------------------------------
-- Recalcular saldo / suma_debe / suma_haber de las cuentas de "Documento 1"
-- a partir de sus movimientos (equivalente a lo que antes hacia el
-- "increment" de Firestore cada vez que se registraba una partida). Solo
-- toca las cuentas de este documento de ejemplo, nunca las de otros.
-- -------------------------------------------------------------------------
UPDATE cuentas c SET
  suma_debe = COALESCE(sub.total_debe, 0),
  suma_haber = COALESCE(sub.total_haber, 0),
  saldo = CASE
    WHEN c.tipo IN ('activo', 'egreso') THEN COALESCE(sub.total_debe, 0) - COALESCE(sub.total_haber, 0)
    ELSE COALESCE(sub.total_haber, 0) - COALESCE(sub.total_debe, 0)
  END
FROM (
  SELECT cuenta_id, SUM(debe) AS total_debe, SUM(haber) AS total_haber
  FROM movimientos
  WHERE estado = 'activa'
  GROUP BY cuenta_id
) sub
WHERE sub.cuenta_id = c.id
  AND c.documento_id IN (SELECT id FROM _doc_demo);

-- -------------------------------------------------------------------------
-- Kardex: costo promedio ponderado (inventario inicial 200 u. a $10 c/u)
-- -------------------------------------------------------------------------
INSERT INTO kardex (documento_id, fecha, concepto, entrada, salida, existencias, costo_unitario, deudor, acreedor, saldo)
SELECT d.id, v.fecha, v.concepto, v.entrada, v.salida, v.existencias, v.costo_unitario, v.deudor, v.acreedor, v.saldo
FROM _doc_demo d, (VALUES
  ('2026-08-01'::date, 'Inventario inicial',              200::numeric, 0::numeric,   200::numeric, 10::numeric, 2000::numeric, 0::numeric,    2000::numeric),
  ('2026-08-03'::date, 'Compra de mercaderia al credito',  500,          0,            700,          10,          5000,          0,             7000),
  ('2026-08-05'::date, 'Venta de mercaderia al contado',     0,          300,          400,          10,          0,             3000,          4000),
  ('2026-08-10'::date, 'Venta de mercaderia al credito',     0,          150,          250,          10,          0,             1500,          2500),
  ('2026-08-18'::date, 'Compra de mercaderia al contado',  200,          0,            450,          10,          2000,          0,             4500),
  ('2026-08-25'::date, 'Venta de mercaderia al contado',     0,          350,          100,          10,          0,             3500,          1000),
  ('2026-08-28'::date, 'Venta de mercaderia al contado',     0,          80,            20,          10,          0,             800,            200)
) AS v(fecha, concepto, entrada, salida, existencias, costo_unitario, deudor, acreedor, saldo);

DROP TABLE IF EXISTS _doc_demo;
DROP TABLE IF EXISTS _sembrar;
