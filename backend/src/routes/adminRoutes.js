const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/* ── Pública: iniciar sesión ── */
router.post('/login', ctrl.login);

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
