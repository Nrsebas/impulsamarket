const pool   = require('../config/db');
const Pedido = require('../models/pedidoModel');

/* ─────────────────────────────────────────────
   PEDIDOS — Controlador
───────────────────────────────────────────── */

/* GET /api/pedidos */
const listarPedidos = async (_req, res) => {
  try {
    const pedidos = await Pedido.getAll();
    res.json(pedidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

/* GET /api/pedidos/:id */
const obtenerPedido = async (req, res) => {
  try {
    const p = await Pedido.getById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el pedido' });
  }
};

/* POST /api/pedidos */
const crearPedido = async (req, res) => {
  try {
    const { nombre_cliente, email_cliente, telefono_cliente, id_servicio, detalles } = req.body;
    if (!nombre_cliente || !email_cliente || !id_servicio)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_cliente))
      return res.status(400).json({ error: 'El correo no es válido' });

    // Verifica que el servicio exista y esté activo
    const [svc] = await pool.query(
      'SELECT id_servicio FROM servicios WHERE id_servicio = ? AND activo = 1',
      [id_servicio]
    );
    if (!svc.length) return res.status(400).json({ error: 'El servicio seleccionado no existe o no está disponible' });

    const nuevo = await Pedido.create({ nombre_cliente, email_cliente, telefono_cliente, id_servicio, detalles });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
};

/* PUT /api/pedidos/:id */
const actualizarPedido = async (req, res) => {
  try {
    const { estado, detalles, id_empleado } = req.body;
    const estados = ['en_proceso','entregado','cancelado'];
    if (estado && !estados.includes(estado))
      return res.status(400).json({ error: 'Estado inválido' });

    const actualizado = await Pedido.update(req.params.id, { estado, detalles, id_empleado });
    if (!actualizado) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el pedido' });
  }
};

/* DELETE /api/pedidos/:id */
const eliminarPedido = async (req, res) => {
  try {
    const filas = await Pedido.remove(req.params.id);
    if (!filas) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ mensaje: 'Pedido eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  }
};

/* GET /api/pedidos/stats */
const estadisticas = async (_req, res) => {
  try {
    const stats = await Pedido.getStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

/* ─────────────────────────────────────────────
   SERVICIOS — Controlador
───────────────────────────────────────────── */

/* GET /api/servicios */
const listarServicios = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, s.precio_base AS precio, c.nombre AS categoria
      FROM servicios s
      JOIN categorias c ON s.id_categoria = c.id_categoria
      WHERE s.activo = 1
      ORDER BY s.precio_base ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
};

/* GET /api/servicios/:id */
const obtenerServicio = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, s.precio_base AS precio, c.nombre AS categoria
      FROM servicios s
      JOIN categorias c ON s.id_categoria = c.id_categoria
      WHERE s.id_servicio = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el servicio' });
  }
};

module.exports = {
  listarPedidos, obtenerPedido, crearPedido, actualizarPedido, eliminarPedido, estadisticas,
  listarServicios, obtenerServicio,
};
