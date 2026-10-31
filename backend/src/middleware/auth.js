const { leerToken } = require('../utils/auth');

/* Exige un token válido en el header  Authorization: Bearer <token> */
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const datos = leerToken(token);
  if (!datos) return res.status(401).json({ error: 'Sesión no válida o vencida' });
  req.usuario = datos;
  next();
}

/* Solo deja pasar a usuarios con rol admin */
function requireAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin')
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  next();
}

module.exports = { requireAuth, requireAdmin };
