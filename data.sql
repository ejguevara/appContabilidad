-- =========================================================================
-- data.sql
-- App Contable - Catalogo de Cuentas + datos de prueba (agosto 2026)
--
-- Codificacion: 1=Activo, 2=Pasivo, 3=Capital, 4=Costos y Gastos, 5=Ingresos
--
-- Uso (despues de correr schema.sql):
--   psql -U postgres -d app_contable -f data.sql
-- =========================================================================

-- -------------------------------------------------------------------------
-- Catalogo de Cuentas
-- -------------------------------------------------------------------------
INSERT INTO cuentas (codigo, nombre, tipo) VALUES
  ('1101', 'Caja', 'activo'),
  ('1102', 'Bancos', 'activo'),
  ('1103', 'Clientes', 'activo'),
  ('1104', 'IVA Credito Fiscal', 'activo'),
  ('1105', 'Inventario', 'activo'),
  ('2101', 'Proveedores', 'pasivo'),
  ('2102', 'IVA Debito Fiscal', 'pasivo'),
  ('2103', 'IVA por Pagar', 'pasivo'),
  ('3101', 'Capital Social', 'patrimonio'),
  ('4101', 'Compras', 'egreso'),
  ('4102', 'Costo de Ventas', 'egreso'),
  ('4103', 'Gastos de Venta', 'egreso'),
  ('4104', 'Gastos de Administracion', 'egreso'),
  ('5101', 'Ventas', 'ingreso')
ON CONFLICT (codigo) DO NOTHING;

-- -------------------------------------------------------------------------
-- Libro Diario: partidas de agosto 2026 (escenario de un mes completo)
-- -------------------------------------------------------------------------

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-01', 'Aportacion de capital de los socios', 10000, 10000)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-01', 'Aportacion de capital de los socios', v.debe, v.haber
FROM p, (VALUES ('1102', 8000::numeric, 0::numeric), ('1105', 2000, 0), ('3101', 0, 10000)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-03', 'Compra de mercaderia al credito', 5650, 5650)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-03', 'Compra de mercaderia al credito', v.debe, v.haber
FROM p, (VALUES ('4101', 5000::numeric, 0::numeric), ('1104', 650, 0), ('2101', 0, 5650)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-05', 'Venta de mercaderia al contado', 9040, 9040)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-05', 'Venta de mercaderia al contado', v.debe, v.haber
FROM p, (VALUES ('1101', 9040::numeric, 0::numeric), ('5101', 0, 8000), ('2102', 0, 1040)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-08', 'Pago parcial a proveedores', 3000, 3000)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-08', 'Pago parcial a proveedores', v.debe, v.haber
FROM p, (VALUES ('2101', 3000::numeric, 0::numeric), ('1102', 0, 3000)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-10', 'Venta de mercaderia al credito', 4520, 4520)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-10', 'Venta de mercaderia al credito', v.debe, v.haber
FROM p, (VALUES ('1103', 4520::numeric, 0::numeric), ('5101', 0, 4000), ('2102', 0, 520)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-15', 'Cobro a clientes', 4520, 4520)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-15', 'Cobro a clientes', v.debe, v.haber
FROM p, (VALUES ('1101', 4520::numeric, 0::numeric), ('1103', 0, 4520)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-18', 'Compra de mercaderia al contado', 2260, 2260)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-18', 'Compra de mercaderia al contado', v.debe, v.haber
FROM p, (VALUES ('4101', 2000::numeric, 0::numeric), ('1104', 260, 0), ('1102', 0, 2260)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-20', 'Pago de gastos de venta (publicidad)', 350, 350)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-20', 'Pago de gastos de venta (publicidad)', v.debe, v.haber
FROM p, (VALUES ('4103', 350::numeric, 0::numeric), ('1101', 0, 350)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-22', 'Pago de gastos de administracion (planilla y alquiler)', 1200, 1200)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-22', 'Pago de gastos de administracion (planilla y alquiler)', v.debe, v.haber
FROM p, (VALUES ('4104', 1200::numeric, 0::numeric), ('1101', 0, 1200)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-25', 'Venta de mercaderia al contado', 7345, 7345)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-25', 'Venta de mercaderia al contado', v.debe, v.haber
FROM p, (VALUES ('1101', 7345::numeric, 0::numeric), ('5101', 0, 6500), ('2102', 0, 845)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-28', 'Venta de mercaderia al contado', 2034, 2034)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-28', 'Venta de mercaderia al contado', v.debe, v.haber
FROM p, (VALUES ('1101', 2034::numeric, 0::numeric), ('5101', 0, 1800), ('2102', 0, 234)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

WITH p AS (
  INSERT INTO partidas (fecha, concepto, total_debe, total_haber)
  VALUES ('2026-08-30', 'Liquidacion de IVA del periodo - IVA por Pagar', 2639, 2639)
  RETURNING id
)
INSERT INTO movimientos (partida_id, cuenta_id, fecha, concepto, debe, haber)
SELECT p.id, c.id, '2026-08-30', 'Liquidacion de IVA del periodo - IVA por Pagar', v.debe, v.haber
FROM p, (VALUES ('2102', 2639::numeric, 0::numeric), ('1104', 0, 910), ('2103', 0, 1729)) AS v(codigo, debe, haber)
JOIN cuentas c ON c.codigo = v.codigo;

-- -------------------------------------------------------------------------
-- Recalcular saldo / suma_debe / suma_haber de cada cuenta a partir de sus
-- movimientos (equivalente a lo que antes hacia el "increment" de Firestore
-- cada vez que se registraba una partida).
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
WHERE sub.cuenta_id = c.id;

-- -------------------------------------------------------------------------
-- Kardex: costo promedio ponderado (inventario inicial 200 u. a $10 c/u)
-- -------------------------------------------------------------------------
INSERT INTO kardex (fecha, concepto, entrada, salida, existencias, costo_unitario, deudor, acreedor, saldo) VALUES
  ('2026-08-01', 'Inventario inicial',              200, 0,   200, 10, 2000, 0,    2000),
  ('2026-08-03', 'Compra de mercaderia al credito',  500, 0,   700, 10, 5000, 0,    7000),
  ('2026-08-05', 'Venta de mercaderia al contado',     0, 300, 400, 10, 0,    3000, 4000),
  ('2026-08-10', 'Venta de mercaderia al credito',     0, 150, 250, 10, 0,    1500, 2500),
  ('2026-08-18', 'Compra de mercaderia al contado',  200, 0,   450, 10, 2000, 0,    4500),
  ('2026-08-25', 'Venta de mercaderia al contado',     0, 350, 100, 10, 0,    3500, 1000),
  ('2026-08-28', 'Venta de mercaderia al contado',     0, 80,   20, 10, 0,    800,   200);
