-- ═══════════════════════════════════════════════════════════════════════
--  IMPULSAMARKET — Base de datos NUEVA (v2)
--  Tablas: usuarios, categorias, servicios, clientes, resenas
--  Llaves foráneas: 4
--
--  usuarios   1──N  clientes    (fk_cliente_usuario)
--  categorias 1──N  servicios   (fk_servicio_categoria)
--  clientes   1──N  resenas     (fk_resena_cliente)
--  servicios  1──N  resenas     (fk_resena_servicio)
--
--  Usuarios de prueba:
--    admin@impulsamarket.co     / Admin123*      (rol admin)
--    empleado@impulsamarket.co  / Empleado123*   (rol empleado)
--    cliente1@correo.com        / Cliente123*    (rol cliente)
--  ¡Cambia estas contraseñas desde el panel antes de entregar!
-- ═══════════════════════════════════════════════════════════════════════

DROP DATABASE IF EXISTS impulsamarket_v2;
CREATE DATABASE impulsamarket_v2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE impulsamarket_v2;

-- ── 1. USUARIOS ─────────────────────────────────────────────────────────
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

-- ── 2. CATEGORIAS ───────────────────────────────────────────────────────
CREATE TABLE categorias (
  id_categoria INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(80)  NOT NULL,
  descripcion  VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_categoria),
  UNIQUE KEY uq_categoria_nombre (nombre)
) ENGINE=InnoDB;

-- ── 3. SERVICIOS ────────────────────────────────────────────────────────
CREATE TABLE servicios (
  id_servicio  INT           NOT NULL AUTO_INCREMENT,
  id_categoria INT           NOT NULL,
  nombre       VARCHAR(100)  NOT NULL,
  descripcion  TEXT          DEFAULT NULL,
  precio       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  activo       TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (id_servicio),
  CONSTRAINT fk_servicio_categoria FOREIGN KEY (id_categoria)
    REFERENCES categorias (id_categoria) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ── 4. CLIENTES ─────────────────────────────────────────────────────────
CREATE TABLE clientes (
  id_cliente INT          NOT NULL AUTO_INCREMENT,
  id_usuario INT          NOT NULL,
  nombre     VARCHAR(120) NOT NULL,
  telefono   VARCHAR(20)  DEFAULT NULL,
  ciudad     VARCHAR(80)  DEFAULT NULL,
  PRIMARY KEY (id_cliente),
  UNIQUE KEY uq_cliente_usuario (id_usuario),
  CONSTRAINT fk_cliente_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ── 5. RESEÑAS ──────────────────────────────────────────────────────────
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
--  DATOS DE PRUEBA
-- ══════════════════════════════════════════
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Administrador',   'admin@impulsamarket.co',    '111dd5b5e9e1206405f54a2e0ec0bc29:d900cf3149c34870fe7e901cccb25c47d759257ad302a6bdba86fad4718601888a0af464846bbe7d1f7b76aa05925150ed2042ee87f1956ebc35681face2b7b3', 'admin'),
  ('Valentina Ríos',  'empleado@impulsamarket.co', '09c0890550a9ededbc9e5f5ab35a82c4:92a7c8df782a07bd1a7004e882eba590d99924f04ff50f2fb5576a31e8771fc95686a3d918819ee079282650eae9e32be1eeb1534d9fd7400f102eec6315e01b',   'empleado'),
  ('Juan Pérez',      'cliente1@correo.com',       '856519c370dbe29aa5cd60dad9f24dcd:4554300bc59a8242280c198d8215f46b80a3ffbd0f57c671322faa7150213c29df36a4bbfbb03c056aae503408b9b4d10ca172cc3e359192a9458f8802bc061a',   'cliente'),
  ('María López',     'cliente2@correo.com',       '856519c370dbe29aa5cd60dad9f24dcd:4554300bc59a8242280c198d8215f46b80a3ffbd0f57c671322faa7150213c29df36a4bbfbb03c056aae503408b9b4d10ca172cc3e359192a9458f8802bc061a',   'cliente'),
  ('Carlos Gómez',    'cliente3@correo.com',       '856519c370dbe29aa5cd60dad9f24dcd:4554300bc59a8242280c198d8215f46b80a3ffbd0f57c671322faa7150213c29df36a4bbfbb03c056aae503408b9b4d10ca172cc3e359192a9458f8802bc061a',   'cliente');

INSERT INTO categorias (nombre, descripcion) VALUES
  ('Diseño Gráfico',    'Logos, branding e identidad visual'),
  ('Marketing Digital', 'Redes sociales y campañas publicitarias'),
  ('Impresión',         'Volantes, pendones y carteles listos para imprenta');

INSERT INTO servicios (id_categoria, nombre, descripcion, precio) VALUES
  (1, 'Logo Profesional',   'Logotipo vectorial en alta resolución con variaciones para fondo claro y oscuro.', 350000),
  (1, 'Branding Completo',  'Logo, paleta de colores, tipografía y manual de marca.',                           950000),
  (2, 'Diseño para Redes',  'Pack mensual de 12 publicaciones para Instagram y Facebook.',                      280000),
  (2, 'Propaganda Digital', 'Campaña en Meta Ads: piezas, configuración y seguimiento por 15 días.',            480000),
  (3, 'Carteles & Impresos','Volantes, pendones o carteles a medida listos para imprenta.',                     150000);

INSERT INTO clientes (id_usuario, nombre, telefono, ciudad) VALUES
  (3, 'Juan Pérez',   '3101234567', 'Medellín'),
  (4, 'María López',  '3209876543', 'Bello'),
  (5, 'Carlos Gómez', '3155554321', 'Envigado');

INSERT INTO resenas (id_cliente, id_servicio, calificacion, comentario) VALUES
  (1, 1, 5, 'El logo quedó exactamente como lo imaginaba. Muy profesionales.'),
  (2, 3, 4, 'Buenas publicaciones y entrega a tiempo.'),
  (3, 2, 5, 'El manual de marca nos ayudó a ordenar todo el negocio.'),
  (1, 3, 4, 'Muy buena atención durante todo el proceso.');

-- ══════════════════════════════════════════
--  VERIFICACIÓN
-- ══════════════════════════════════════════
SELECT 'usuarios' AS tabla, COUNT(*) AS registros FROM usuarios   UNION ALL
SELECT 'categorias',        COUNT(*)              FROM categorias UNION ALL
SELECT 'servicios',         COUNT(*)              FROM servicios  UNION ALL
SELECT 'clientes',          COUNT(*)              FROM clientes   UNION ALL
SELECT 'resenas',           COUNT(*)              FROM resenas;
