const express = require('express');
const router  = express.Router();
const pool    = require('../config/dbAdmin');

/* GET /api/publico/resenas — reseñas para la página de inicio (sin datos privados) */
router.get('/resenas', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.calificacion, r.comentario, r.fecha,
             cl.nombre AS cliente, cl.ciudad, s.nombre AS servicio
      FROM resenas r
      JOIN clientes  cl ON r.id_cliente  = cl.id_cliente
      JOIN servicios s  ON r.id_servicio = s.id_servicio
      ORDER BY r.fecha DESC, r.id_resena DESC
      LIMIT 6`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las reseñas' });
  }
});

module.exports = router;
