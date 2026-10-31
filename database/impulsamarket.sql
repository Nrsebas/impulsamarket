-- ═══════════════════════════════════════════════════════════════════════
--  IMPULSAMARKET — Base de datos MySQL Unificada
--  Proyecto Media Técnica
--  Autor: ImpulsaMarket
-- ═══════════════════════════════════════════════════════════════════════
--
--  MER (Modelo Entidad-Relación) — 8 Tablas y 9 Llaves Foráneas
--  ─────────────────────────────────────────────────────────────────────
--
--  ┌──────────────────┐         ┌──────────────────┐
--  │     USUARIOS     │         │    CATEGORIAS    │
--  │──────────────────│         │──────────────────│
--  │ PK id_usuario    │──┬───┐  │ PK id_categoria  │──┐
--  │ nombre           │  │   │  │ nombre (UNIQ)    │  │
--  │ email (UNIQ)     │  │   │  │ descripcion      │  │
--  │ password_hash    │  │   │  └──────────────────┘  │
--  │ rol              │  │   │                        │ 1:N
--  │ activo           │  │   │                        ▼
--  │ fecha_registro   │  │   │  ┌──────────────────┐  │
--  └──────────────────┘  │   │  │    SERVICIOS     │◀─┘
--                        │   │  │──────────────────│
--         1:0..1         │   │  │ PK id_servicio   │──┬──────────────┐
--    ┌───────────────────┘   │  │ FK id_categoria  │  │              │
--    ▼                       │  │ nombre           │  │              │
--  ┌──────────────────┐      │  │ descripcion      │  │              │
--  │     CLIENTES     │      │  │ precio_base      │  │              │
--  │──────────────────│      │  │ activo           │  │              │
--  │ PK id_cliente    │──┬───┼─┐└──────────────────┘  │              │
--  │ FK id_usuario(UQ)│  │   │ │                      │              │
--  │ nombre           │  │   │ │       1:0..1         │              │
--  │ email (UNIQ)     │  │   └─┼────────────────────┐ │              │
--  │ telefono         │  │     │                    ▼ │              │
--  │ ciudad           │  │     │  ┌──────────────────┐│              │
--  │ fecha_reg        │  │     │  │    EMPLEADOS     ││              │
--  └──────────────────┘  │     │  │──────────────────││              │
--                        │     │  │ PK id_empleado   │┼───────┐      │
--          1:N           │     │  │ FK id_usuario(UQ)││       │      │
--    ┌───────────────────┘     │  │ nombre           ││       │      │
--    ▼                         │  │ cargo            ││       │      │
--  ┌──────────────────┐        │  │ email (UNIQ)     ││       │      │
--  │     RESENAS      │        │  │ activo           ││       │      │
--  │──────────────────│        │  └──────────────────┘│       │      │
--  │ PK id_resena     │        │                      │       │      │
--  │ FK id_cliente    │        │ 1:N              1:N │   1:N │  1:N │
--  │ FK id_servicio   │◀───────┼──────────────────────┼───────┼──────┘
--  │ calificacion     │        ▼                      ▼       ▼
--  │ comentario       │      ┌──────────────────────────────────┐
--  │ fecha            │      │             PEDIDOS              │
--  └──────────────────┘      │──────────────────────────────────│
--                            │ PK id_pedido                     │──┐
--                            │ FK id_cliente                    │  │
--                            │ FK id_servicio                   │  │
--                            │ FK id_empleado (NULL)            │  │
--                            │ detalles                         │  │ 1:0..1
--                            │ estado                           │  │
--                            │ fecha_pedido                     │  │
--                            └──────────────────────────────────┘  │
--                                                                  ▼
--                            ┌──────────────────────────────────┐  │
--                            │              PAGOS               │◀─┘
--                            │──────────────────────────────────│
--                            │ PK id_pago                       │
--                            │ FK id_pedido (UNIQ)              │
--                            │ monto                            │
--                            │ metodo_pago                      │
--                            │ estado_pago                      │
--                            │ fecha_pago                       │
--                            │ observacion                      │
--                            └──────────────────────────────────┘
--
--  Relaciones:
--    1. USUARIOS   1 ── 0..1 CLIENTES   (fk_cliente_usuario)
--    2. USUARIOS   1 ── 0..1 EMPLEADOS  (fk_empleado_usuario)
--    3. CATEGORIAS 1 ── N    SERVICIOS  (fk_servicio_categoria)
--    4. CLIENTES   1 ── N    PEDIDOS    (fk_ped_cliente)
--    5. SERVICIOS  1 ── N    PEDIDOS    (fk_ped_servicio)
--    6. EMPLEADOS  1 ── N    PEDIDOS    (fk_ped_empleado)
--    7. PEDIDOS    1 ── 0..1 PAGOS      (fk_pago_pedido)
--    8. CLIENTES   1 ── N    RESENAS    (fk_resena_cliente)
--    9. SERVICIOS  1 ── N    RESENAS    (fk_resena_servicio)
--
--  Usuarios de prueba para el panel (admin.html):
--    admin@impulsamarket.co     / Admin123*      (rol admin)
--    empleado@impulsamarket.co  / Empleado123*   (rol empleado)
--    cliente1@correo.com        / Cliente123*    (rol cliente)
-- ═══════════════════════════════════════════════════════════════════════


-- ── Crear y seleccionar la base de datos ──────────────────────────────
DROP DATABASE IF EXISTS impulsamarket_v2;
DROP DATABASE IF EXISTS impulsamarket;
CREATE DATABASE impulsamarket
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE impulsamarket;


-- ══════════════════════════════════════════
--  TABLA 1: USUARIOS
-- ══════════════════════════════════════════
CREATE TABLE usuarios (
  id_usuario     INT          NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(120) NOT NULL,
  email          VARCHAR(150) NOT NULL,
  password_hash  VARCHAR(200) NOT NULL,
  rol            ENUM('admin','empleado','cliente') NOT NULL DEFAULT 'cliente',
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  fecha_registro TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 2: CATEGORIAS
-- ══════════════════════════════════════════
CREATE TABLE categorias (
  id_categoria INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(80)  NOT NULL,
  descripcion  VARCHAR(255) DEFAULT NULL,

  PRIMARY KEY (id_categoria),
  UNIQUE KEY uq_categoria_nombre (nombre)
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 3: SERVICIOS
-- ══════════════════════════════════════════
CREATE TABLE servicios (
  id_servicio  INT           NOT NULL AUTO_INCREMENT,
  id_categoria INT           NOT NULL,
  nombre       VARCHAR(100)  NOT NULL,
  descripcion  TEXT          DEFAULT NULL,
  precio_base  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  activo       TINYINT(1)    NOT NULL DEFAULT 1,

  PRIMARY KEY (id_servicio),
  CONSTRAINT chk_servicio_precio CHECK (precio_base >= 0),
  CONSTRAINT fk_servicio_categoria FOREIGN KEY (id_categoria)
    REFERENCES categorias (id_categoria) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 4: CLIENTES
-- ══════════════════════════════════════════
CREATE TABLE clientes (
  id_cliente  INT          NOT NULL AUTO_INCREMENT,
  id_usuario  INT          DEFAULT NULL,
  nombre      VARCHAR(120) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  telefono    VARCHAR(20)  DEFAULT NULL,
  ciudad      VARCHAR(80)  DEFAULT NULL,
  fecha_reg   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_cliente),
  UNIQUE KEY uq_email (email),
  UNIQUE KEY uq_cliente_usuario (id_usuario),
  CONSTRAINT fk_cliente_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 5: EMPLEADOS
-- ══════════════════════════════════════════
CREATE TABLE empleados (
  id_empleado INT          NOT NULL AUTO_INCREMENT,
  id_usuario  INT          DEFAULT NULL,
  nombre      VARCHAR(120) NOT NULL,
  cargo       VARCHAR(80)  DEFAULT 'Diseñador',
  email       VARCHAR(150) NOT NULL,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,

  PRIMARY KEY (id_empleado),
  UNIQUE KEY uq_email_emp (email),
  UNIQUE KEY uq_empleado_usuario (id_usuario),
  CONSTRAINT fk_empleado_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 6: PEDIDOS
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
  CONSTRAINT fk_ped_cliente  FOREIGN KEY (id_cliente)
    REFERENCES clientes (id_cliente)   ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_ped_servicio FOREIGN KEY (id_servicio)
    REFERENCES servicios (id_servicio) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ped_empleado FOREIGN KEY (id_empleado)
    REFERENCES empleados (id_empleado) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 7: PAGOS
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
  CONSTRAINT chk_pago_monto CHECK (monto >= 0),
  CONSTRAINT fk_pago_pedido FOREIGN KEY (id_pedido)
    REFERENCES pedidos (id_pedido) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  TABLA 8: RESEÑAS
-- ══════════════════════════════════════════
CREATE TABLE resenas (
  id_resena    INT        NOT NULL AUTO_INCREMENT,
  id_cliente   INT        NOT NULL,
  id_servicio  INT        NOT NULL,
  calificacion TINYINT    NOT NULL,
  comentario   TEXT       DEFAULT NULL,
  fecha        TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_resena),
  CONSTRAINT chk_calificacion CHECK (calificacion BETWEEN 1 AND 5),
  CONSTRAINT fk_resena_cliente  FOREIGN KEY (id_cliente)
    REFERENCES clientes  (id_cliente)  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_resena_servicio FOREIGN KEY (id_servicio)
    REFERENCES servicios (id_servicio) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ══════════════════════════════════════════
--  REGISTROS DE PRUEBA
-- ══════════════════════════════════════════

-- ── 1. Usuarios ──────────────────────────
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
  ('Administrador',   'admin@impulsamarket.co',    '111dd5b5e9e1206405f54a2e0ec0bc29:d900cf3149c34870fe7e901cccb25c47d759257ad302a6bdba86fad4718601888a0af464846bbe7d1f7b76aa05925150ed2042ee87f1956ebc35681face2b7b3', 'admin',    1),
  ('Valentina Ríos',  'empleado@impulsamarket.co', '09c0890550a9ededbc9e5f5ab35a82c4:92a7c8df782a07bd1a7004e882eba590d99924f04ff50f2fb5576a31e8771fc95686a3d918819ee079282650eae9e32be1eeb1534d9fd7400f102eec6315e01b', 'empleado', 1),
  ('Juan Pérez',      'cliente1@correo.com',       '856519c370dbe29aa5cd60dad9f24dcd:4554300bc59a8242280c198d8215f46b80a3ffbd0f57c671322faa7150213c29df36a4bbfbb03c056aae503408b9b4d10ca172cc3e359192a9458f8802bc061a', 'cliente',  1),
  ('María López',     'cliente2@correo.com',       '856519c370dbe29aa5cd60dad9f24dcd:4554300bc59a8242280c198d8215f46b80a3ffbd0f57c671322faa7150213c29df36a4bbfbb03c056aae503408b9b4d10ca172cc3e359192a9458f8802bc061a', 'cliente',  1),
  ('Carlos Gómez',    'cliente3@correo.com',       '856519c370dbe29aa5cd60dad9f24dcd:4554300bc59a8242280c198d8215f46b80a3ffbd0f57c671322faa7150213c29df36a4bbfbb03c056aae503408b9b4d10ca172cc3e359192a9458f8802bc061a', 'cliente',  1);


-- ── 2. Categorías ────────────────────────
INSERT INTO categorias (nombre, descripcion) VALUES
  ('Diseño Gráfico',    'Logos, branding e identidad visual'),
  ('Marketing Digital', 'Redes sociales y campañas publicitarias'),
  ('Impresión',         'Volantes, pendones y carteles listos para imprenta');


-- ── 3. Servicios ─────────────────────────
INSERT INTO servicios (id_categoria, nombre, descripcion, precio_base, activo) VALUES
  (1, 'Logo Profesional',    'Diseño de logotipo vectorial en alta resolución, incluye variaciones para fondo claro y oscuro.', 350000, 1),
  (1, 'Branding Completo',   'Identidad visual completa: logo, paleta de colores, tipografía y manual de marca.',               950000, 1),
  (2, 'Diseño para Redes',   'Pack mensual de 12 publicaciones animadas para Instagram y Facebook, con copy incluido.',         280000, 1),
  (2, 'Propaganda Digital',  'Campaña publicitaria en Meta Ads: diseño de piezas + configuración + seguimiento 15 días.',       480000, 1),
  (3, 'Carteles & Impresos', 'Diseño de volantes, pendones o carteles en tamaño a medida listos para imprenta.',                150000, 1);


-- ── 4. Empleados ─────────────────────────
INSERT INTO empleados (id_usuario, nombre, cargo, email, activo) VALUES
  (2,    'Valentina Ríos',   'Diseñadora Senior',     'empleado@impulsamarket.co',  1),
  (NULL, 'Mateo Salazar',    'Diseñador Web',          'm.salazar@impulsamarket.co', 1),
  (NULL, 'Isabella Moreno',  'Community Manager',      'i.moreno@impulsamarket.co',  1),
  (NULL, 'Santiago Torres',  'Asesor Comercial',       's.torres@impulsamarket.co',  1),
  (NULL, 'Camila Herrera',   'Diseñadora Gráfica Jr.', 'c.herrera@impulsamarket.co', 1);


-- ── 5. Clientes ──────────────────────────
INSERT INTO clientes (id_usuario, nombre, email, telefono, ciudad) VALUES
  (3,    'Juan Pérez',       'cliente1@correo.com',        '3101234567', 'Medellín'),
  (4,    'María López',      'cliente2@correo.com',        '3209876543', 'Bello'),
  (5,    'Carlos Gómez',     'cliente3@correo.com',        '3155554321', 'Envigado'),
  (NULL, 'Luisa Martínez',   'luisa.m@correo.co',          '3001112233', 'Medellín'),
  (NULL, 'Andrés Castillo',  'andres.castillo@gmail.com',  '3184445566', 'Itagüí'),
  (NULL, 'Sara Jiménez',     'sara.j@negocio.co',          '3122223344', 'Sabaneta'),
  (NULL, 'Ricardo Vargas',   'r.vargas@gmail.com',         '3167778899', 'Medellín'),
  (NULL, 'Paola Sánchez',    'paola.s@gmail.com',          '3189990011', 'Rionegro'),
  (NULL, 'Felipe Rojas',     'felipe.rojas@outlook.com',   '3143336677', 'Medellín'),
  (NULL, 'Diana Cárdenas',   'diana.c@empresa.co',         '3056667788', 'Envigado');


-- ── 6. Pedidos ───────────────────────────
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


-- ── 7. Pagos ─────────────────────────────
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


-- ── 8. Reseñas ───────────────────────────
INSERT INTO resenas (id_cliente, id_servicio, calificacion, comentario) VALUES
  (1, 1, 5, 'El logo quedó exactamente como lo imaginaba. Muy profesionales.'),
  (2, 3, 4, 'Buenas publicaciones y entrega a tiempo.'),
  (3, 2, 5, 'El manual de marca nos ayudó a ordenar todo el negocio.'),
  (1, 3, 4, 'Muy buena atención durante todo el proceso.');


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
  cl.ciudad,
  s.nombre            AS servicio,
  cat.nombre          AS categoria,
  s.precio_base,
  p.detalles,
  p.estado,
  e.nombre            AS empleado,
  pa.monto            AS monto_pagado,
  pa.metodo_pago,
  pa.estado_pago,
  p.fecha_pedido
FROM pedidos p
JOIN clientes   cl  ON p.id_cliente   = cl.id_cliente
JOIN servicios  s   ON p.id_servicio  = s.id_servicio
JOIN categorias cat ON s.id_categoria = cat.id_categoria
LEFT JOIN empleados e  ON p.id_empleado = e.id_empleado
LEFT JOIN pagos     pa ON pa.id_pedido  = p.id_pedido;


-- Vista: Estadísticas globales
CREATE OR REPLACE VIEW v_estadisticas AS
SELECT
  COUNT(*)                                                          AS total_pedidos,
  COALESCE(SUM(p.estado = 'en_proceso'), 0)                         AS en_proceso,
  COALESCE(SUM(p.estado = 'entregado'), 0)                          AS entregados,
  COALESCE(SUM(p.estado = 'cancelado'), 0)                          AS cancelados,
  COALESCE(SUM(pa.monto), 0)                                        AS ingresos_totales,
  COALESCE(SUM(CASE WHEN pa.estado_pago = 'pagado' THEN pa.monto ELSE 0 END), 0) AS ingresos_cobrados
FROM pedidos p
LEFT JOIN pagos pa ON pa.id_pedido = p.id_pedido;


-- ══════════════════════════════════════════
--  VERIFICACIÓN FINAL
-- ══════════════════════════════════════════
SELECT 'Usuarios'   AS Tabla, COUNT(*) AS Registros FROM usuarios   UNION ALL
SELECT 'Categorias'         , COUNT(*)              FROM categorias UNION ALL
SELECT 'Servicios'          , COUNT(*)              FROM servicios  UNION ALL
SELECT 'Clientes'           , COUNT(*)              FROM clientes   UNION ALL
SELECT 'Empleados'          , COUNT(*)              FROM empleados  UNION ALL
SELECT 'Pedidos'            , COUNT(*)              FROM pedidos    UNION ALL
SELECT 'Pagos'              , COUNT(*)              FROM pagos      UNION ALL
SELECT 'Resenas'            , COUNT(*)              FROM resenas;

SELECT * FROM v_estadisticas;

