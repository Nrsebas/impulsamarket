const pool = require('../config/db');

/* ─────────────────────────────────────────────
   Modelo: Pedido
   Operaciones CRUD sobre la tabla `pedidos`
   y consultas de apoyo
───────────────────────────────────────────── */

/* ── Obtener todos los pedidos con datos del cliente y servicio ── */
async function getAll() {
  const [rows] = await pool.query(`
    SELECT
      p.id_pedido,
      cl.nombre           AS nombre_cliente,
      cl.email            AS email_cliente,
      cl.telefono         AS telefono_cliente,
      s.nombre            AS nombre_servicio,
      p.id_servicio,
      p.detalles,
      p.estado,
      p.fecha_pedido,
      e.nombre            AS nombre_empleado
    FROM pedidos p
    JOIN clientes  cl ON p.id_cliente  = cl.id_cliente
    JOIN servicios s  ON p.id_servicio = s.id_servicio
    LEFT JOIN empleados e ON p.id_empleado = e.id_empleado
    ORDER BY p.fecha_pedido DESC
  `);
  return rows;
}

/* ── Obtener un pedido por ID ── */
async function getById(id) {
  const [rows] = await pool.query(`
    SELECT p.*, cl.nombre AS nombre_cliente, s.nombre AS nombre_servicio
    FROM pedidos p
    JOIN clientes  cl ON p.id_cliente  = cl.id_cliente
    JOIN servicios s  ON p.id_servicio = s.id_servicio
    WHERE p.id_pedido = ?`, [id]);
  return rows[0];
}

/* ── Crear pedido (busca o crea el cliente primero) ── */
async function create({ nombre_cliente, email_cliente, telefono_cliente, id_servicio, detalles }) {
  // Buscar cliente existente por email
  let [rows] = await pool.query('SELECT id_cliente FROM clientes WHERE email = ?', [email_cliente]);
  let id_cliente;

  if (rows.length) {
    id_cliente = rows[0].id_cliente;
  } else {
    const [res] = await pool.query(
      'INSERT INTO clientes (nombre, email, telefono) VALUES (?, ?, ?)',
      [nombre_cliente, email_cliente, telefono_cliente || null]
    );
    id_cliente = res.insertId;
  }

  const [result] = await pool.query(
    'INSERT INTO pedidos (id_cliente, id_servicio, detalles, estado) VALUES (?, ?, ?, ?)',
    [id_cliente, id_servicio, detalles || null, 'en_proceso']
  );
  return getById(result.insertId);
}

/* ── Actualizar estado y/o detalles ── */
async function update(id, { estado, detalles, id_empleado }) {
  // COALESCE: si un campo no viene en la petición, se conserva el valor actual
  // (antes se borraba el empleado asignado y fallaba si faltaba "estado")
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
      COUNT(*) AS total,
      SUM(estado = 'en_proceso')  AS en_proceso,
      SUM(estado = 'entregado')   AS entregados,
      SUM(estado = 'cancelado')   AS cancelados
    FROM pedidos
  `);
  return rows[0];
}

module.exports = { getAll, getById, create, update, remove, getStats };
