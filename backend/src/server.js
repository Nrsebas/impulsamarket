require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const routes  = require('./routes/pedidoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors({ origin: '*' }));           // Permitir peticiones del frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Logger básico ── */
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

/* ── Rutas ── */
app.use('/api/publico', publicRoutes); // Reseñas públicas para el inicio
app.use('/api/admin', adminRoutes);   // Panel de administración (BD v2)
app.use('/api', routes);

/* ── Health Check ── */
app.get('/', (_req, res) => {
  res.json({
    proyecto: 'ImpulsaMarket API',
    version:  '1.0.0',
    estado:   'En línea ✅',
    endpoints: [
      'GET    /api/servicios',
      'GET    /api/servicios/:id',
      'GET    /api/pedidos',
      'GET    /api/pedidos/stats',
      'GET    /api/pedidos/:id',
      'POST   /api/pedidos',
      'PUT    /api/pedidos/:id',
      'DELETE /api/pedidos/:id',
    ]
  });
});

/* ── 404 ── */
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

/* ── Error global ── */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

/* ── Iniciar servidor ── */
app.listen(PORT, () => {
  console.log(`\n🚀 ImpulsaMarket API → http://localhost:${PORT}`);
  console.log(`   Docs:              http://localhost:${PORT}/`);
  console.log(`   Pedidos:           http://localhost:${PORT}/api/pedidos`);
  console.log(`   Servicios:         http://localhost:${PORT}/api/servicios\n`);
});
