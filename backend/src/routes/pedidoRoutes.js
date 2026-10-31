const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/pedidocontroller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/* ── PEDIDOS ── */
router.get   ('/pedidos/stats', ctrl.estadisticas);   // estadísticas
router.get   ('/pedidos',       ctrl.listarPedidos);
router.get   ('/pedidos/:id',   ctrl.obtenerPedido);
router.post  ('/pedidos',       ctrl.crearPedido);
router.put   ('/pedidos/:id',   requireAuth, requireAdmin, ctrl.actualizarPedido);
router.delete('/pedidos/:id',   requireAuth, requireAdmin, ctrl.eliminarPedido);

/* ── SERVICIOS ── */
router.get('/servicios',     ctrl.listarServicios);
router.get('/servicios/:id', ctrl.obtenerServicio);

module.exports = router;
