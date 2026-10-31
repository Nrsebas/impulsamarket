const pool = require('../config/dbAdmin');
const { hashPassword, verificarPassword, crearToken } = require('../utils/auth');

/* ─────────────────────────────────────────────
   Panel de administración — CRUD de la BD v2
   Las columnas permitidas están en una lista
   fija (whitelist): nunca se arma SQL con
   nombres que vengan del cliente.
───────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES    = ['admin', 'empleado', 'cliente'];

const ENTIDADES = {
  categorias: {
    tabla: 'categorias', pk: 'id_categoria',
    campos: ['nombre', 'descripcion'], requeridos: ['nombre'],
    listar: 'SELECT * FROM categorias ORDER BY nombre',
  },
  servicios: {
    tabla: 'servicios', pk: 'id_servicio',
    campos: ['id_categoria', 'nombre', 'descripcion', 'precio', 'activo'],
    requeridos: ['id_categoria', 'nombre', 'precio'],
    listar: `SELECT s.*, c.nombre AS categoria
             FROM servicios s JOIN categorias c ON s.id_categoria = c.id_categoria
             ORDER BY s.id_servicio`,
  },
  clientes: {
    tabla: 'clientes', pk: 'id_cliente',
    campos: ['id_usuario', 'nombre', 'telefono', 'ciudad'],
    requeridos: ['id_usuario', 'nombre'],
    listar: `SELECT cl.*, u.email
             FROM clientes cl JOIN usuarios u ON cl.id_usuario = u.id_usuario
             ORDER BY cl.id_cliente`,
  },
  resenas: {
    tabla: 'resenas', pk: 'id_resena',
    campos: ['id_cliente', 'id_servicio', 'calificacion', 'comentario'],
    requeridos: ['id_cliente', 'id_servicio', 'calificacion'],
    listar: `SELECT r.*, cl.nombre AS cliente, s.nombre AS servicio
             FROM resenas r
             JOIN clientes  cl ON r.id_cliente  = cl.id_cliente
             JOIN servicios s  ON r.id_servicio = s.id_servicio
             ORDER BY r.fecha DESC, r.id_resena DESC`,
  },
  usuarios: {
    tabla: 'usuarios', pk: 'id_usuario',
    campos: ['nombre', 'email', 'rol', 'activo'],
    requeridos: ['nombre', 'email'],
    listar: `SELECT id_usuario, nombre, email, rol, activo, fecha_registro
             FROM usuarios ORDER BY id_usuario`,
  },
};

/* ── Validaciones por campo ── */
function validar(entidad, datos, esCreacion) {
  const cfg = ENTIDADES[entidad];
  if (esCreacion) {
    for (const c of cfg.requeridos) {
      if (datos[c] === undefined || datos[c] === null || String(datos[c]).trim() === '')
        return `El campo "${c}" es obligatorio`;
    }
    if (entidad === 'usuarios' && !datos.password) return 'La contraseña es obligatoria';
  }
  for (const c of cfg.requeridos) {
    if (c in datos && (datos[c] === null || String(datos[c]).trim() === ''))
      return `El campo "${c}" no puede quedar vacío`;
  }
  if (datos.email !== undefined && !EMAIL_RE.test(datos.email)) return 'El correo no es válido';
  if (datos.rol !== undefined && !ROLES.includes(datos.rol)) return 'Rol inválido';
  if (datos.precio !== undefined && !(Number(datos.precio) >= 0)) return 'El precio debe ser un número mayor o igual a 0';
  if (datos.calificacion !== undefined) {
    const n = Number(datos.calificacion);
    if (!Number.isInteger(n) || n < 1 || n > 5) return 'La calificación debe ser un número entero de 1 a 5';
  }
  if (datos.password !== undefined && datos.password !== '' && String(datos.password).length < 6)
    return 'La contraseña debe tener al menos 6 caracteres';
  return null;
}

/* ── Traducir errores de MySQL a mensajes entendibles ── */
function responderError(res, err, accion) {
  if (err.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ error: 'Ya existe un registro con ese valor (correo o nombre repetido)' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2')
    return res.status(400).json({ error: 'El registro relacionado seleccionado no existe' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2')
    return res.status(409).json({ error: 'No se puede eliminar: tiene registros relacionados' });
  console.error(err);
  res.status(500).json({ error: `Error al ${accion}` });
}

/* ── Limpiar el body: solo columnas permitidas, '' → NULL en opcionales ── */
function limpiar(entidad, body) {
  const cfg = ENTIDADES[entidad];
  const out = {};
  for (const c of cfg.campos) {
    if (!Object.prototype.hasOwnProperty.call(body, c)) continue;
    let v = typeof body[c] === 'string' ? body[c].trim() : body[c];
    if (v === '' && !cfg.requeridos.includes(c)) v = null;
    if (c === 'activo') v = (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;
    out[c] = v;
  }
  if (entidad === 'usuarios' && body.password) out.password = String(body.password);
  return out;
}

/* ══════════ LOGIN ══════════ */
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Ingresa correo y contraseña' });

    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [String(email).trim()]);
    const u = rows[0];
    if (!u || !u.activo || !verificarPassword(password, u.password_hash))
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    if (u.rol !== 'admin')
      return res.status(403).json({ error: 'Solo los administradores pueden entrar al panel' });

    res.json({ token: crearToken(u), usuario: { id: u.id_usuario, nombre: u.nombre, email: u.email, rol: u.rol } });
  } catch (err) { responderError(res, err, 'iniciar sesión'); }
};

/* ══════════ RESUMEN ══════════ */
const resumen = async (_req, res) => {
  try {
    const [[r]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios)   AS usuarios,
        (SELECT COUNT(*) FROM categorias) AS categorias,
        (SELECT COUNT(*) FROM servicios)  AS servicios,
        (SELECT COUNT(*) FROM clientes)   AS clientes,
        (SELECT COUNT(*) FROM resenas)    AS resenas,
        (SELECT ROUND(AVG(calificacion), 1) FROM resenas) AS promedio_calificacion`);
    res.json(r);
  } catch (err) { responderError(res, err, 'obtener el resumen'); }
};

/* ══════════ CRUD GENÉRICO ══════════ */
const listar = (entidad) => async (_req, res) => {
  try {
    const [rows] = await pool.query(ENTIDADES[entidad].listar);
    res.json(rows);
  } catch (err) { responderError(res, err, 'obtener los registros'); }
};

const crear = (entidad) => async (req, res) => {
  try {
    const cfg = ENTIDADES[entidad];
    const datos = limpiar(entidad, req.body || {});
    const msg = validar(entidad, datos, true);
    if (msg) return res.status(400).json({ error: msg });

    if (entidad === 'usuarios') {
      datos.password_hash = hashPassword(datos.password);
      delete datos.password;
    }
    const cols = Object.keys(datos);
    const [r] = await pool.query(
      `INSERT INTO ${cfg.tabla} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map(c => datos[c])
    );
    res.status(201).json({ [cfg.pk]: r.insertId, mensaje: 'Registro creado' });
  } catch (err) { responderError(res, err, 'crear el registro'); }
};

const actualizar = (entidad) => async (req, res) => {
  try {
    const cfg = ENTIDADES[entidad];
    const id = Number(req.params.id);
    const datos = limpiar(entidad, req.body || {});
    const msg = validar(entidad, datos, false);
    if (msg) return res.status(400).json({ error: msg });

    // Un admin no puede quitarse su propio rol ni desactivarse
    if (entidad === 'usuarios' && id === req.usuario.id &&
        ((datos.rol && datos.rol !== 'admin') || datos.activo === 0))
      return res.status(400).json({ error: 'No puedes quitarte el rol de admin ni desactivar tu propia cuenta' });

    if (entidad === 'usuarios' && datos.password) {
      datos.password_hash = hashPassword(datos.password);
    }
    delete datos.password;

    const cols = Object.keys(datos);
    if (!cols.length) return res.status(400).json({ error: 'No hay campos para actualizar' });

    const [r] = await pool.query(
      `UPDATE ${cfg.tabla} SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE ${cfg.pk} = ?`,
      [...cols.map(c => datos[c]), id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ mensaje: 'Registro actualizado' });
  } catch (err) { responderError(res, err, 'actualizar el registro'); }
};

const eliminar = (entidad) => async (req, res) => {
  try {
    const cfg = ENTIDADES[entidad];
    const id = Number(req.params.id);
    if (entidad === 'usuarios' && id === req.usuario.id)
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });

    const [r] = await pool.query(`DELETE FROM ${cfg.tabla} WHERE ${cfg.pk} = ?`, [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ mensaje: 'Registro eliminado' });
  } catch (err) { responderError(res, err, 'eliminar el registro'); }
};

module.exports = { ENTIDADES, login, resumen, listar, crear, actualizar, eliminar };
