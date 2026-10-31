const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const routes  = require('./routes/pedidoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app           = express();
const PORT          = Number(process.env.PORT) || 3000;
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT) || 5501;

/* ── Middleware ── */
app.use(cors({ origin: '*' }));           // Permitir peticiones del frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Logger básico ── */
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

/* ── Rutas de la API ── */
app.use('/api/publico', publicRoutes); // Reseñas públicas para el inicio
app.use('/api/admin', adminRoutes);   // Panel de administración (BD unificada impulsamarket)
app.use('/api', routes);

/* ── Health Check de la API (Puerto 3000) ── */
app.get('/', (_req, res) => {
  res.json({
    proyecto: 'ImpulsaMarket API',
    version:  '2.0.0',
    estado:   'En línea ✅',
    base_datos: process.env.DB_NAME || 'impulsamarket',
    endpoints: [
      'GET    /api/servicios',
      'GET    /api/servicios/:id',
      'GET    /api/pedidos',
      'GET    /api/pedidos/stats',
      'GET    /api/pedidos/:id',
      'POST   /api/pedidos',
      'PUT    /api/pedidos/:id',
      'DELETE /api/pedidos/:id',
      'GET    /api/publico/resenas',
      'POST   /api/admin/login',
      'GET    /api/admin/resumen',
      'CRUD   /api/admin/:entidad (pedidos, pagos, servicios, categorias, clientes, empleados, resenas, usuarios)',
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

/* ── Iniciar Backend API en el puerto 3000 ── */
app.listen(PORT, () => {
  console.log(`\n🚀 Backend API   → http://localhost:${PORT}`);
  console.log(`   Pedidos:        http://localhost:${PORT}/api/pedidos`);
  console.log(`   Servicios:      http://localhost:${PORT}/api/servicios`);
});

/* ── Iniciar Frontend en un puerto separado (5501) automáticamente ── */
const frontendApp = express();
frontendApp.use(express.static(path.join(__dirname, '../../frontend')));

const frontServer = frontendApp.listen(FRONTEND_PORT, () => {
  console.log(`🌐 Frontend Web  → http://localhost:${FRONTEND_PORT}`);
  console.log(`   Panel Admin:    http://localhost:${FRONTEND_PORT}/admin.html\n`);
});

frontServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`ℹ️  El puerto del frontend (${FRONTEND_PORT}) ya está activo en otra instancia.\n`);
  }
});
