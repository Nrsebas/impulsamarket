-- ═══════════════════════════════════════════════════════════════════════
--  IMPULSAMARKET — Base de datos MySQL
--  Proyecto Media Técnica
--  Autor: ImpulsaMarket
-- ═══════════════════════════════════════════════════════════════════════
--
--  MER (Modelo Entidad-Relación)  — Texto ASCII
--  ────────────────────────────────────────────
--
--  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
--  │   CLIENTES   │       │   PEDIDOS    │       │  SERVICIOS   │
--  │──────────────│       │──────────────│       │──────────────│
--  │ PK id_cliente│──┐    │ PK id_pedido │    ┌──│PK id_servicio│
--  │ nombre       │  └───>│ FK id_cliente│    │  │ nombre       │
--  │ email (UNIQ) │       │ FK id_servicio│<──┘  │ descripcion  │
--  │ telefono     │       │ FK id_empleado│<──┐  │ precio_base  │
--  │ fecha_reg    │       │ detalles     │   │  │ categoria    │
--  └──────────────┘       │ estado       │   │  └──────────────┘
--                         │ fecha_pedido │   │
--                         └──────────────┘   │
--                                            │
--  ┌──────────────┐       ┌──────────────┐  │
--  │  EMPLEADOS   │       │   PAGOS      │  │
--  │──────────────│       │──────────────│  │
--  │ PK id_emple..│──────>│ PK id_pago   │  │
--  │ nombre       │       │ FK id_pedido │──┘
--  │ cargo        │       │ monto        │
--  │ email        │       │ metodo_pago  │
--  │ activo       │       │ estado_pago  │
--  └──────────────┘       │ fecha_pago   │
--                         └──────────────┘
--
--  Relaciones:
--    CLIENTES   1──N  PEDIDOS      (un cliente puede tener muchos pedidos)
--    SERVICIOS  1──N  PEDIDOS      (un servicio puede estar en muchos pedidos)
--    EMPLEADOS  1──N  PEDIDOS      (un empleado atiende muchos pedidos)
--    PEDIDOS    1──1  PAGOS        (cada pedido tiene máx. un pago)
-- ═══════════════════════════════════════════════════════════════════════


-- ── Crear y seleccionar la base de datos ──────────────────────────────
DROP DATABASE IF EXISTS impulsamarket;
CREATE DATABASE impulsamarket
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE impulsamarket;


-- ══════════════════════════════════════════
--  TABLA 1: CLIENTES
-- ══════════════════════════════════════════
CREATE TABLE clientes (
  id_cliente  INT          NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(120) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  telefono    VARCHAR(20)  DEFAULT NULL,
  fecha_reg   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_cliente),
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 2: SERVICIOS
-- ══════════════════════════════════════════
CREATE TABLE servicios (
  id_servicio INT           NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100)  NOT NULL,
  descripcion TEXT          DEFAULT NULL,
  precio_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  categoria   VARCHAR(60)   DEFAULT 'General',

  PRIMARY KEY (id_servicio)
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 3: EMPLEADOS
-- ══════════════════════════════════════════
CREATE TABLE empleados (
  id_empleado INT          NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(120) NOT NULL,
  cargo       VARCHAR(80)  DEFAULT 'Diseñador',
  email       VARCHAR(150) NOT NULL,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,

  PRIMARY KEY (id_empleado),
  UNIQUE KEY uq_email_emp (email)
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 4: PEDIDOS
-- ══════════════════════════════════════════
CREATE TABLE pedidos (
  id_pedido    INT         NOT NULL AUTO_INCREMENT,
  id_cliente   INT         NOT NULL,
  id_servicio  INT         NOT NULL,
  id_empleado  INT         DEFAULT NULL,
  detalles     TEXT        DEFAULT NULL,
  estado       ENUM('en_proceso','entregado','cancelado') NOT NULL DEFAULT 'en_proceso',
  fecha_pedido TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_pedido),

  -- Llaves foráneas
  CONSTRAINT fk_ped_cliente  FOREIGN KEY (id_cliente)  REFERENCES clientes (id_cliente)  ON DELETE CASCADE,
  CONSTRAINT fk_ped_servicio FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio) ON DELETE RESTRICT,
  CONSTRAINT fk_ped_empleado FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE SET NULL
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 5: PAGOS
-- ══════════════════════════════════════════
CREATE TABLE pagos (
  id_pago      INT           NOT NULL AUTO_INCREMENT,
  id_pedido    INT           NOT NULL,
  monto        DECIMAL(10,2) NOT NULL,
  metodo_pago  ENUM('efectivo','transferencia','nequi','daviplata','otro') NOT NULL DEFAULT 'efectivo',
  estado_pago  ENUM('pendiente','pagado','rechazado') NOT NULL DEFAULT 'pendiente',
  fecha_pago   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacion  VARCHAR(255)  DEFAULT NULL,

  PRIMARY KEY (id_pago),
  UNIQUE KEY uq_pago_pedido (id_pedido),   -- 1 pago por pedido

  CONSTRAINT fk_pago_pedido FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  REGISTROS DE PRUEBA
-- ══════════════════════════════════════════

-- ── 1. Servicios ─────────────────────────
INSERT INTO servicios (nombre, descripcion, precio_base, categoria) VALUES
  ('Logo Profesional',      'Diseño de logotipo vectorial en alta resolución, incluye variaciones para fondo claro y oscuro.',   350000, 'Diseño Gráfico'),
  ('Branding Completo',     'Identidad visual completa: logo, paleta de colores, tipografía y manual de marca.',                 950000, 'Diseño Gráfico'),
  ('Diseño para Redes',     'Pack mensual de 12 publicaciones animadas para Instagram y Facebook, con copy incluido.',           280000, 'Marketing Digital'),
  ('Propaganda Digital',    'Campaña publicitaria en Meta Ads: diseño de piezas + configuración + seguimiento 15 días.',         480000, 'Marketing Digital'),
  ('Carteles & Impresos',   'Diseño de volantes, pendones o carteles en tamaño a medida listos para imprenta.',                  150000, 'Impresión');


-- ── 2. Empleados ─────────────────────────
INSERT INTO empleados (nombre, cargo, email, activo) VALUES
  ('Valentina Ríos',   'Diseñadora Senior',     'v.rios@impulsamarket.co',    1),
  ('Mateo Salazar',    'Diseñador Web',          'm.salazar@impulsamarket.co', 1),
  ('Isabella Moreno',  'Community Manager',      'i.moreno@impulsamarket.co',  1),
  ('Santiago Torres',  'Asesor Comercial',       's.torres@impulsamarket.co',  1),
  ('Camila Herrera',   'Diseñadora Gráfica Jr.', 'c.herrera@impulsamarket.co', 1);


-- ── 3. Clientes ──────────────────────────
INSERT INTO clientes (nombre, email, telefono) VALUES
  ('Juan Pérez',          'juan.perez@gmail.com',       '3101234567'),
  ('María López',         'maria.lopez@hotmail.com',    '3209876543'),
  ('Carlos Gómez',        'cgomez@empresa.com',         '3155554321'),
  ('Luisa Martínez',      'luisa.m@correo.co',          '3001112233'),
  ('Andrés Castillo',     'andres.castillo@gmail.com',  '3184445566'),
  ('Sara Jiménez',        'sara.j@negocio.co',          '3122223344'),
  ('Ricardo Vargas',      'r.vargas@gmail.com',         '3167778899'),
  ('Paola Sánchez',       'paola.s@gmail.com',          '3189990011'),
  ('Felipe Rojas',        'felipe.rojas@outlook.com',   '3143336677'),
  ('Diana Cárdenas',      'diana.c@empresa.co',         '3056667788');


-- ── 4. Pedidos ───────────────────────────
INSERT INTO pedidos (id_cliente, id_servicio, id_empleado, detalles, estado, fecha_pedido) VALUES
  (1,  1, 1, 'Logo para tienda de ropa llamada "Bella Moda". Colores: dorado y negro.', 'entregado',  '2026-09-05 09:15:00'),
  (2,  3, 3, 'Pack de redes para panadería. Tono cálido y familiar. Publicar lunes y jueves.', 'en_proceso', '2026-09-12 10:30:00'),
  (3,  4, 4, 'Campaña Meta Ads para venta de muebles artesanales. Presupuesto: $100.000.', 'en_proceso', '2026-09-18 14:00:00'),
  (4,  2, 1, 'Branding para empresa de consultoría contable. Preferencia por azul corporativo.', 'entregado',  '2026-08-20 11:00:00'),
  (5,  5, 2, 'Pendón 200x80 cm para feria empresarial. Incluir logo y teléfono.', 'cancelado',  '2026-09-22 08:45:00'),
  (6,  1, 5, 'Logo para restaurante de comida italiana. Estilo clásico europeo.', 'en_proceso', '2026-10-01 09:00:00'),
  (7,  3, 3, 'Redes para peluquería masculina. Estilo urbano y moderno.', 'entregado',  '2026-09-28 13:15:00'),
  (8,  4, 4, 'Campaña de lanzamiento de nueva línea de cosméticos naturales.', 'en_proceso', '2026-10-05 10:00:00'),
  (9,  2, 1, 'Branding completo para startup de delivery de alimentos saludables.', 'en_proceso', '2026-10-10 15:30:00'),
  (10, 5, 2, 'Volantes A5 para promoción de clases de yoga. 500 unidades.', 'entregado',  '2026-10-15 09:00:00'),
  (1,  3, 3, 'Segundo pack de redes para "Bella Moda". Enfoque en stories de Instagram.', 'en_proceso', '2026-10-20 11:00:00'),
  (3,  1, 5, 'Rediseño de logo actual. Modernizar sin perder esencia.', 'en_proceso', '2026-10-22 08:00:00');


-- ── 5. Pagos ─────────────────────────────
INSERT INTO pagos (id_pedido, monto, metodo_pago, estado_pago, fecha_pago, observacion) VALUES
  (1,  350000, 'nequi',         'pagado',    '2026-09-05 09:30:00', 'Pago completo recibido al inicio'),
  (2,  140000, 'transferencia', 'pagado',    '2026-09-12 11:00:00', '50% anticipo'),
  (3,  240000, 'efectivo',      'pendiente', '2026-09-18 14:30:00', 'Pago contra entrega'),
  (4,  950000, 'daviplata',     'pagado',    '2026-08-20 12:00:00', 'Pago total'),
  (5,  150000, 'efectivo',      'rechazado', '2026-09-22 09:00:00', 'Pedido cancelado por el cliente'),
  (6,  175000, 'transferencia', 'pagado',    '2026-10-01 09:30:00', '50% anticipo'),
  (7,  280000, 'nequi',         'pagado',    '2026-09-28 14:00:00', 'Pago completo'),
  (8,  480000, 'transferencia', 'pendiente', '2026-10-05 10:30:00', 'Pendiente segunda cuota'),
  (9,  475000, 'daviplata',     'pagado',    '2026-10-10 16:00:00', '50% anticipo pagado'),
  (10, 150000, 'efectivo',      'pagado',    '2026-10-15 09:30:00', 'Pago al recoger'),
  (11, 140000, 'nequi',         'pendiente', '2026-10-20 11:30:00', 'Anticipo pendiente'),
  (12, 175000, 'transferencia', 'pendiente', '2026-10-22 08:30:00', 'Esperando confirmación bancaria');


-- ══════════════════════════════════════════
--  VISTAS ÚTILES
-- ══════════════════════════════════════════

-- Vista: Resumen de pedidos completo
CREATE OR REPLACE VIEW v_pedidos_detalle AS
SELECT
  p.id_pedido,
  cl.nombre           AS cliente,
  cl.email            AS email_cliente,
  cl.telefono,
  s.nombre            AS servicio,
  s.categoria,
  s.precio_base,
  p.detalles,
  p.estado,
  e.nombre            AS empleado,
  pa.monto            AS monto_pagado,
  pa.metodo_pago,
  pa.estado_pago,
  p.fecha_pedido
FROM pedidos p
JOIN clientes  cl ON p.id_cliente  = cl.id_cliente
JOIN servicios s  ON p.id_servicio = s.id_servicio
LEFT JOIN empleados e  ON p.id_empleado = e.id_empleado
LEFT JOIN pagos     pa ON pa.id_pedido  = p.id_pedido;


-- Vista: Estadísticas globales
CREATE OR REPLACE VIEW v_estadisticas AS
SELECT
  COUNT(*)                             AS total_pedidos,
  SUM(estado = 'en_proceso')           AS en_proceso,
  SUM(estado = 'entregado')            AS entregados,
  SUM(estado = 'cancelado')            AS cancelados,
  SUM(pa.monto)                        AS ingresos_totales,
  SUM(CASE WHEN pa.estado_pago = 'pagado' THEN pa.monto ELSE 0 END) AS ingresos_cobrados
FROM pedidos p
LEFT JOIN pagos pa ON pa.id_pedido = p.id_pedido;


-- ══════════════════════════════════════════
--  VERIFICACIÓN FINAL
-- ══════════════════════════════════════════
SELECT 'Clientes'  AS Tabla, COUNT(*) AS Registros FROM clientes  UNION ALL
SELECT 'Servicios'           , COUNT(*)             FROM servicios UNION ALL
SELECT 'Empleados'           , COUNT(*)             FROM empleados UNION ALL
SELECT 'Pedidos'             , COUNT(*)             FROM pedidos   UNION ALL
SELECT 'Pagos'               , COUNT(*)             FROM pagos;

SELECT * FROM v_estadisticas;
