const pool = require('../config/db');

/* ─────────────────────────────────────────────
   Modelo: Pedido
   Operaciones CRUD sobre la tabla `pedidos`
   y sus tablas relacionadas (`clientes`, `servicios`,
   `categorias`, `empleados`, `pagos`)
───────────────────────────────────────────── */

/* ── Obtener todos los pedidos con datos completos ── */
async function getAll() {
  const [rows] = await pool.query(`
    SELECT
      p.id_pedido,
      p.id_cliente,
      cl.nombre           AS nombre_cliente,
      cl.email            AS email_cliente,
      cl.telefono         AS telefono_cliente,
      cl.ciudad           AS ciudad_cliente,
      p.id_servicio,
      s.nombre            AS nombre_servicio,
      cat.nombre          AS categoria_servicio,
      s.precio_base,
      p.id_empleado,
      e.nombre            AS nombre_empleado,
      p.detalles,
      p.estado,
      p.fecha_pedido,
      pa.id_pago,
      pa.monto            AS monto_pagado,
      pa.metodo_pago,
      pa.estado_pago
    FROM pedidos p
    JOIN clientes   cl  ON p.id_cliente   = cl.id_cliente
    JOIN servicios  s   ON p.id_servicio  = s.id_servicio
    JOIN categorias cat ON s.id_categoria = cat.id_categoria
    LEFT JOIN empleados e  ON p.id_empleado = e.id_empleado
    LEFT JOIN pagos     pa ON pa.id_pedido  = p.id_pedido
    ORDER BY p.fecha_pedido DESC, p.id_pedido DESC
  `);
  return rows;
}

/* ── Obtener un pedido por ID con relaciones ── */
async function getById(id) {
  const [rows] = await pool.query(`
    SELECT
      p.*,
      cl.nombre           AS nombre_cliente,
      cl.email            AS email_cliente,
      cl.telefono         AS telefono_cliente,
      s.nombre            AS nombre_servicio,
      cat.nombre          AS categoria_servicio,
      s.precio_base,
      e.nombre            AS nombre_empleado,
      pa.id_pago,
      pa.monto            AS monto_pagado,
      pa.metodo_pago,
      pa.estado_pago
    FROM pedidos p
    JOIN clientes   cl  ON p.id_cliente   = cl.id_cliente
    JOIN servicios  s   ON p.id_servicio  = s.id_servicio
    JOIN categorias cat ON s.id_categoria = cat.id_categoria
    LEFT JOIN empleados e  ON p.id_empleado = e.id_empleado
    LEFT JOIN pagos     pa ON pa.id_pedido  = p.id_pedido
    WHERE p.id_pedido = ?`, [id]);
  return rows[0];
}

/* ── Crear pedido (busca o crea el cliente y lo vincula con usuario si existe) ── */
async function create({ nombre_cliente, email_cliente, telefono_cliente, id_servicio, detalles }) {
  const emailLimpio = String(email_cliente).trim();
  const telLimpio   = telefono_cliente ? String(telefono_cliente).trim() : null;

  // Buscar cliente existente por email
  const [rows] = await pool.query('SELECT id_cliente FROM clientes WHERE email = ?', [emailLimpio]);
  let id_cliente;

  if (rows.length) {
    id_cliente = rows[0].id_cliente;
    if (telLimpio) {
      await pool.query(
        'UPDATE clientes SET telefono = COALESCE(?, telefono) WHERE id_cliente = ?',
        [telLimpio, id_cliente]
      );
    }
  } else {
    // Si ya existe una cuenta de usuario con ese correo, vincular id_usuario automáticamente
    const [usr] = await pool.query('SELECT id_usuario FROM usuarios WHERE email = ?', [emailLimpio]);
    const id_usuario = usr.length ? usr[0].id_usuario : null;

    const [res] = await pool.query(
      'INSERT INTO clientes (id_usuario, nombre, email, telefono) VALUES (?, ?, ?, ?)',
      [id_usuario, String(nombre_cliente).trim(), emailLimpio, telLimpio]
    );
    id_cliente = res.insertId;
  }

  const [result] = await pool.query(
    'INSERT INTO pedidos (id_cliente, id_servicio, detalles, estado) VALUES (?, ?, ?, ?)',
    [id_cliente, id_servicio, detalles || null, 'en_proceso']
  );
  return getById(result.insertId);
}

/* ── Actualizar estado, detalles y/o empleado asignado ── */
async function update(id, { estado, detalles, id_empleado }) {
  await pool.query(
    'UPDATE pedidos SET estado = COALESCE(?, estado), detalles = COALESCE(?, detalles), id_empleado = COALESCE(?, id_empleado) WHERE id_pedido = ?',
    [estado ?? null, detalles ?? null, id_empleado ?? null, id]
  );
  return getById(id);
}

/* ── Eliminar pedido ── */
async function remove(id) {
  const [res] = await pool.query('DELETE FROM pedidos WHERE id_pedido = ?', [id]);
  return res.affectedRows;
}

/* ── Estadísticas rápidas ── */
async function getStats() {
  const [rows] = await pool.query(`
    SELECT
      COUNT(*)                                                          AS total,
      COALESCE(SUM(p.estado = 'en_proceso'), 0)                         AS en_proceso,
      COALESCE(SUM(p.estado = 'entregado'), 0)                          AS entregados,
      COALESCE(SUM(p.estado = 'cancelado'), 0)                          AS cancelados,
      COALESCE(SUM(pa.monto), 0)                                        AS ingresos_totales,
      COALESCE(SUM(CASE WHEN pa.estado_pago = 'pagado' THEN pa.monto ELSE 0 END), 0) AS ingresos_cobrados
    FROM pedidos p
    LEFT JOIN pagos pa ON pa.id_pedido = p.id_pedido
  `);
  return rows[0];
}

module.exports = { getAll, getById, create, update, remove, getStats };
