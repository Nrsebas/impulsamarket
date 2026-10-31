const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/* ── Públicas: iniciar sesión y registrarse como cliente ── */
router.post('/login',    ctrl.login);
router.post('/registro', ctrl.registro);

/* ── Autenticadas (Portal del Cliente — CRUD propio) ── */
router.get   ('/mi-cuenta',       requireAuth, ctrl.miCuenta);
router.post  ('/mis-pedidos',     requireAuth, ctrl.crearMiPedido);
router.put   ('/mis-pedidos/:id', requireAuth, ctrl.actualizarMiPedido);
router.delete('/mis-pedidos/:id', requireAuth, ctrl.eliminarMiPedido);
router.post  ('/mis-resenas',     requireAuth, ctrl.crearMiResena);
router.put   ('/mis-resenas/:id', requireAuth, ctrl.actualizarMiResena);
router.delete('/mis-resenas/:id', requireAuth, ctrl.eliminarMiResena);
router.put   ('/mi-perfil',       requireAuth, ctrl.actualizarMiPerfil);

/* ── Todo lo demás exige sesión de administrador ── */
router.use(requireAuth, requireAdmin);
router.get('/resumen', ctrl.resumen);

for (const entidad of Object.keys(ctrl.ENTIDADES)) {
  router.get   (`/${entidad}`,     ctrl.listar(entidad));
  router.post  (`/${entidad}`,     ctrl.crear(entidad));
  router.put   (`/${entidad}/:id`, ctrl.actualizar(entidad));
  router.delete(`/${entidad}/:id`, ctrl.eliminar(entidad));
}

module.exports = router;
