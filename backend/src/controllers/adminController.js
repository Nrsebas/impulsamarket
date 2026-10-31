const pool = require('../config/dbAdmin');
const { hashPassword, verificarPassword, crearToken } = require('../utils/auth');

/* ─────────────────────────────────────────────
   Panel de administración y Portal de Clientes
   Las columnas permitidas están en una lista
   fija (whitelist): nunca se arma SQL con
   nombres que vengan del cliente.
───────────────────────────────────────────── */
const EMAIL_RE       = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES          = ['admin', 'empleado', 'cliente'];
const ESTADOS_PEDIDO = ['en_proceso', 'entregado', 'cancelado'];
const METODOS_PAGO   = ['efectivo', 'transferencia', 'nequi', 'daviplata', 'otro'];
const ESTADOS_PAGO   = ['pendiente', 'pagado', 'rechazado'];

const ENTIDADES = {
  pedidos: {
    tabla: 'pedidos', pk: 'id_pedido',
    campos: ['id_cliente', 'id_servicio', 'id_empleado', 'detalles', 'estado'],
    requeridos: ['id_cliente', 'id_servicio'],
    listar: `SELECT p.*,
                    cl.nombre AS cliente,
                    cl.email  AS email_cliente,
                    s.nombre  AS servicio,
                    s.precio_base,
                    e.nombre  AS empleado,
                    pa.monto  AS monto_pagado,
                    pa.estado_pago
             FROM pedidos p
             JOIN clientes  cl ON p.id_cliente  = cl.id_cliente
             JOIN servicios s  ON p.id_servicio = s.id_servicio
             LEFT JOIN empleados e  ON p.id_empleado = e.id_empleado
             LEFT JOIN pagos     pa ON pa.id_pedido  = p.id_pedido
             ORDER BY p.fecha_pedido DESC, p.id_pedido DESC`,
  },
  pagos: {
    tabla: 'pagos', pk: 'id_pago',
    campos: ['id_pedido', 'monto', 'metodo_pago', 'estado_pago', 'observacion'],
    requeridos: ['id_pedido', 'monto'],
    listar: `SELECT pa.*,
                    cl.nombre AS cliente,
                    s.nombre  AS servicio,
                    CONCAT('#', p.id_pedido, ' — ', cl.nombre, ' (', s.nombre, ')') AS pedido_desc
             FROM pagos pa
             JOIN pedidos   p  ON pa.id_pedido  = p.id_pedido
             JOIN clientes  cl ON p.id_cliente  = cl.id_cliente
             JOIN servicios s  ON p.id_servicio = s.id_servicio
             ORDER BY pa.fecha_pago DESC, pa.id_pago DESC`,
  },
  servicios: {
    tabla: 'servicios', pk: 'id_servicio',
    campos: ['id_categoria', 'nombre', 'descripcion', 'precio_base', 'activo'],
    requeridos: ['id_categoria', 'nombre', 'precio_base'],
    listar: `SELECT s.*, s.precio_base AS precio, c.nombre AS categoria
             FROM servicios s JOIN categorias c ON s.id_categoria = c.id_categoria
             ORDER BY s.id_servicio`,
  },
  categorias: {
    tabla: 'categorias', pk: 'id_categoria',
    campos: ['nombre', 'descripcion'], requeridos: ['nombre'],
    listar: 'SELECT * FROM categorias ORDER BY id_categoria',
  },
  clientes: {
    tabla: 'clientes', pk: 'id_cliente',
    campos: ['id_usuario', 'nombre', 'email', 'telefono', 'ciudad'],
    requeridos: ['nombre', 'email'],
    listar: `SELECT cl.*, u.email AS usuario_email
             FROM clientes cl LEFT JOIN usuarios u ON cl.id_usuario = u.id_usuario
             ORDER BY cl.id_cliente`,
  },
  empleados: {
    tabla: 'empleados', pk: 'id_empleado',
    campos: ['id_usuario', 'nombre', 'cargo', 'email', 'activo'],
    requeridos: ['nombre', 'email'],
    listar: `SELECT e.*, u.email AS usuario_email
             FROM empleados e LEFT JOIN usuarios u ON e.id_usuario = u.id_usuario
             ORDER BY e.id_empleado`,
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
  if (datos.estado !== undefined && !ESTADOS_PEDIDO.includes(datos.estado)) return 'Estado de pedido inválido';
  if (datos.metodo_pago !== undefined && !METODOS_PAGO.includes(datos.metodo_pago)) return 'Método de pago inválido';
  if (datos.estado_pago !== undefined && !ESTADOS_PAGO.includes(datos.estado_pago)) return 'Estado de pago inválido';
  if (datos.precio_base !== undefined && !(Number(datos.precio_base) >= 0)) return 'El precio debe ser un número mayor o igual a 0';
  if (datos.monto !== undefined && !(Number(datos.monto) >= 0)) return 'El monto debe ser un número mayor o igual a 0';
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
    return res.status(409).json({ error: 'Ya existe un registro con ese valor único (correo, nombre, usuario vinculado o pago de pedido repetido)' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2')
    return res.status(400).json({ error: 'El registro relacionado seleccionado no existe' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2')
    return res.status(409).json({ error: 'No se puede eliminar: tiene registros relacionados (por ejemplo, servicios o pedidos asociados)' });
  console.error(err);
  res.status(500).json({ error: `Error al ${accion}` });
}

/* ── Limpiar el body: solo columnas permitidas, '' → NULL en opcionales ── */
function limpiar(entidad, rawBody) {
  const cfg  = ENTIDADES[entidad];
  const body = { ...rawBody };
  if (entidad === 'servicios' && body.precio !== undefined && body.precio_base === undefined) {
    body.precio_base = body.precio;
  }
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

/* ── Busca o asegura el registro de cliente vinculado a un usuario ── */
async function asegurarPerfilCliente(u) {
  const [porUsuario] = await pool.query('SELECT * FROM clientes WHERE id_usuario = ?', [u.id_usuario]);
  if (porUsuario.length) return porUsuario[0];

  const [porEmail] = await pool.query('SELECT * FROM clientes WHERE email = ?', [u.email]);
  if (porEmail.length) {
    await pool.query('UPDATE clientes SET id_usuario = ? WHERE id_cliente = ?', [u.id_usuario, porEmail[0].id_cliente]);
    return { ...porEmail[0], id_usuario: u.id_usuario };
  }

  if (u.rol === 'cliente') {
    const [ins] = await pool.query(
      'INSERT INTO clientes (id_usuario, nombre, email) VALUES (?, ?, ?)',
      [u.id_usuario, u.nombre, u.email]
    );
    return { id_cliente: ins.insertId, id_usuario: u.id_usuario, nombre: u.nombre, email: u.email, telefono: null, ciudad: null };
  }
  return null;
}

async function obtenerPerfilDeSesion(userId) {
  const [uRows] = await pool.query('SELECT * FROM usuarios WHERE id_usuario = ?', [userId]);
  if (!uRows.length) return { usuario: null, perfil: null };
  const perfil = await asegurarPerfilCliente(uRows[0]);
  return { usuario: uRows[0], perfil };
}

/* ══════════ LOGIN (Admin o Cliente) ══════════ */
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Ingresa correo y contraseña' });

    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [String(email).trim()]);
    const u = rows[0];
    if (!u || !u.activo || !verificarPassword(password, u.password_hash))
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

    const perfil = await asegurarPerfilCliente(u);

    res.json({
      token: crearToken(u),
      usuario: {
        id:         u.id_usuario,
        nombre:     u.nombre,
        email:      u.email,
        rol:        u.rol,
        id_cliente: perfil?.id_cliente || null,
        telefono:   perfil?.telefono   || null,
        ciudad:     perfil?.ciudad     || null,
      },
    });
  } catch (err) { responderError(res, err, 'iniciar sesión'); }
};

/* ══════════ REGISTRO PÚBLICO DE CLIENTES ══════════ */
const registro = async (req, res) => {
  try {
    const nombre   = String(req.body?.nombre   || '').trim();
    const email    = String(req.body?.email    || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const telefono = String(req.body?.telefono || '').trim() || null;
    const ciudad   = String(req.body?.ciudad   || '').trim() || null;

    if (!nombre || !email || !password)
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    if (!EMAIL_RE.test(email))
      return res.status(400).json({ error: 'El correo electrónico no es válido' });
    if (password.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const [existeUsr] = await pool.query('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
    if (existeUsr.length)
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo electrónico' });

    const [resUsr] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, 1)',
      [nombre, email, hashPassword(password), 'cliente']
    );
    const id_usuario = resUsr.insertId;

    const [existeCli] = await pool.query('SELECT id_cliente FROM clientes WHERE email = ?', [email]);
    let id_cliente;
    if (existeCli.length) {
      id_cliente = existeCli[0].id_cliente;
      await pool.query(
        'UPDATE clientes SET id_usuario = ?, nombre = ?, telefono = COALESCE(?, telefono), ciudad = COALESCE(?, ciudad) WHERE id_cliente = ?',
        [id_usuario, nombre, telefono, ciudad, id_cliente]
      );
    } else {
      const [resCli] = await pool.query(
        'INSERT INTO clientes (id_usuario, nombre, email, telefono, ciudad) VALUES (?, ?, ?, ?, ?)',
        [id_usuario, nombre, email, telefono, ciudad]
      );
      id_cliente = resCli.insertId;
    }

    const u = { id_usuario, rol: 'cliente' };
    res.status(201).json({
      mensaje: 'Cuenta creada exitosamente',
      token: crearToken(u),
      usuario: { id: id_usuario, nombre, email, rol: 'cliente', id_cliente, telefono, ciudad },
    });
  } catch (err) { responderError(res, err, 'registrar la cuenta'); }
};

/* ══════════ PORTAL DEL CLIENTE AUTENTICADO (CRUD COMPLETO) ══════════ */
const miCuenta = async (req, res) => {
  try {
    const { usuario: u, perfil } = await obtenerPerfilDeSesion(req.usuario.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    let pedidos = [];
    let resenas = [];
    if (perfil) {
      const [pRows] = await pool.query(`
        SELECT p.id_pedido, p.id_servicio, p.id_empleado,
               s.nombre AS servicio, c.nombre AS categoria,
               s.precio_base, p.detalles, p.estado, p.fecha_pedido,
               e.nombre AS empleado, pa.id_pago, pa.monto AS monto_pagado, pa.metodo_pago, pa.estado_pago
        FROM pedidos p
        JOIN servicios  s ON p.id_servicio  = s.id_servicio
        JOIN categorias c ON s.id_categoria = c.id_categoria
        LEFT JOIN empleados e  ON p.id_empleado = e.id_empleado
        LEFT JOIN pagos     pa ON pa.id_pedido  = p.id_pedido
        WHERE p.id_cliente = ?
        ORDER BY p.fecha_pedido DESC, p.id_pedido DESC`,
        [perfil.id_cliente]
      );
      pedidos = pRows;

      const [rRows] = await pool.query(`
        SELECT r.id_resena, r.id_servicio, s.nombre AS servicio, r.calificacion, r.comentario, r.fecha
        FROM resenas r
        JOIN servicios s ON r.id_servicio = s.id_servicio
        WHERE r.id_cliente = ?
        ORDER BY r.fecha DESC, r.id_resena DESC`,
        [perfil.id_cliente]
      );
      resenas = rRows;
    }

    const [servicios] = await pool.query(
      'SELECT id_servicio, nombre, precio_base FROM servicios WHERE activo = 1 ORDER BY precio_base ASC'
    );

    res.json({
      usuario: {
        id: u.id_usuario,
        nombre: perfil?.nombre || u.nombre,
        email: u.email,
        rol: u.rol,
        id_cliente: perfil?.id_cliente || null,
        telefono: perfil?.telefono || '',
        ciudad: perfil?.ciudad || '',
      },
      pedidos,
      resenas,
      servicios,
    });
  } catch (err) { responderError(res, err, 'obtener tu cuenta'); }
};

/* POST /api/admin/mis-pedidos */
const crearMiPedido = async (req, res) => {
  try {
    const { id_servicio, detalles } = req.body || {};
    if (!id_servicio) return res.status(400).json({ error: 'Selecciona un servicio' });

    const { usuario, perfil } = await obtenerPerfilDeSesion(req.usuario.id);
    if (!usuario || !perfil) return res.status(400).json({ error: 'No se encontró perfil de cliente' });

    const [svc] = await pool.query('SELECT id_servicio FROM servicios WHERE id_servicio = ? AND activo = 1', [id_servicio]);
    if (!svc.length) return res.status(400).json({ error: 'El servicio seleccionado no está disponible' });

    const [ins] = await pool.query(
      'INSERT INTO pedidos (id_cliente, id_servicio, detalles, estado) VALUES (?, ?, ?, ?)',
      [perfil.id_cliente, id_servicio, String(detalles || '').trim() || null, 'en_proceso']
    );
    res.status(201).json({ id_pedido: ins.insertId, mensaje: 'Pedido creado exitosamente' });
  } catch (err) { responderError(res, err, 'crear tu pedido'); }
};

/* PUT /api/admin/mis-pedidos/:id — Editar detalles/servicio, Cancelar o Reactivar */
const actualizarMiPedido = async (req, res) => {
  try {
    const id_pedido = Number(req.params.id);
    const { accion, id_servicio, detalles } = req.body || {};

    const { perfil } = await obtenerPerfilDeSesion(req.usuario.id);
    if (!perfil) return res.status(400).json({ error: 'No se encontró perfil de cliente' });

    const [pRows] = await pool.query(`
      SELECT p.*, pa.estado_pago
      FROM pedidos p
      LEFT JOIN pagos pa ON pa.id_pedido = p.id_pedido
      WHERE p.id_pedido = ? AND p.id_cliente = ?`,
      [id_pedido, perfil.id_cliente]
    );
    if (!pRows.length) return res.status(404).json({ error: 'Pedido no encontrado en tu cuenta' });
    const pedido = pRows[0];

    // 1. Acción: Cancelar pedido (permitido siempre que NO esté entregado)
    if (accion === 'cancelar') {
      if (pedido.estado === 'entregado')
        return res.status(400).json({ error: 'No puedes cancelar un pedido que ya fue entregado' });
      if (pedido.estado === 'cancelado')
        return res.status(400).json({ error: 'Este pedido ya está cancelado' });

      await pool.query('UPDATE pedidos SET estado = ? WHERE id_pedido = ?', ['cancelado', id_pedido]);
      // Si tenía un pago pendiente, pasarlo a rechazado automáticamente
      await pool.query(
        `UPDATE pagos
         SET estado_pago = 'rechazado',
             observacion = COALESCE(observacion, 'Pedido cancelado por el cliente')
         WHERE id_pedido = ? AND estado_pago = 'pendiente'`,
        [id_pedido]
      );
      return res.json({ mensaje: 'Pedido cancelado correctamente' });
    }

    // 2. Acción: Reactivar un pedido cancelado
    if (accion === 'reactivar') {
      if (pedido.estado !== 'cancelado')
        return res.status(400).json({ error: 'Solo se pueden reactivar pedidos cancelados' });

      await pool.query('UPDATE pedidos SET estado = ? WHERE id_pedido = ?', ['en_proceso', id_pedido]);
      await pool.query(
        `UPDATE pagos SET estado_pago = 'pendiente' WHERE id_pedido = ? AND estado_pago = 'rechazado'`,
        [id_pedido]
      );
      return res.json({ mensaje: 'Pedido reactivado y puesto en proceso' });
    }

    // 3. Acción por defecto: Editar detalles y/o servicio (solo mientras está en_proceso)
    if (pedido.estado !== 'en_proceso')
      return res.status(400).json({ error: 'Solo puedes modificar pedidos que estén en proceso' });

    let nuevoServicio = pedido.id_servicio;
    if (id_servicio && Number(id_servicio) !== Number(pedido.id_servicio)) {
      if (pedido.estado_pago === 'pagado')
        return res.status(400).json({ error: 'No puedes cambiar el servicio de un pedido que ya fue pagado; solo sus detalles' });
      const [svc] = await pool.query('SELECT id_servicio FROM servicios WHERE id_servicio = ? AND activo = 1', [id_servicio]);
      if (!svc.length) return res.status(400).json({ error: 'El servicio seleccionado no está disponible' });
      nuevoServicio = Number(id_servicio);
    }

    const nuevosDetalles = detalles !== undefined ? (String(detalles).trim() || null) : pedido.detalles;
    await pool.query(
      'UPDATE pedidos SET id_servicio = ?, detalles = ? WHERE id_pedido = ?',
      [nuevoServicio, nuevosDetalles, id_pedido]
    );
    res.json({ mensaje: 'Pedido actualizado correctamente' });
  } catch (err) { responderError(res, err, 'actualizar tu pedido'); }
};

/* DELETE /api/admin/mis-pedidos/:id — Eliminar pedido propio (si no está entregado ni pagado) */
const eliminarMiPedido = async (req, res) => {
  try {
    const id_pedido = Number(req.params.id);
    const { perfil } = await obtenerPerfilDeSesion(req.usuario.id);
    if (!perfil) return res.status(400).json({ error: 'No se encontró perfil de cliente' });

    const [pRows] = await pool.query(`
      SELECT p.*, pa.estado_pago
      FROM pedidos p
      LEFT JOIN pagos pa ON pa.id_pedido = p.id_pedido
      WHERE p.id_pedido = ? AND p.id_cliente = ?`,
      [id_pedido, perfil.id_cliente]
    );
    if (!pRows.length) return res.status(404).json({ error: 'Pedido no encontrado en tu cuenta' });
    const pedido = pRows[0];

    if (pedido.estado === 'entregado')
      return res.status(400).json({ error: 'No se puede eliminar un pedido que ya fue entregado' });
    if (pedido.estado_pago === 'pagado')
      return res.status(400).json({ error: 'No se puede eliminar un pedido con pago registrado como pagado' });

    await pool.query('DELETE FROM pedidos WHERE id_pedido = ?', [id_pedido]);
    res.json({ mensaje: 'Pedido eliminado permanentemente' });
  } catch (err) { responderError(res, err, 'eliminar tu pedido'); }
};

/* POST /api/admin/mis-resenas */
const crearMiResena = async (req, res) => {
  try {
    const { id_servicio, calificacion, comentario } = req.body || {};
    const cal = Number(calificacion);
    if (!id_servicio || !Number.isInteger(cal) || cal < 1 || cal > 5)
      return res.status(400).json({ error: 'Selecciona un servicio y una calificación de 1 a 5' });

    const { perfil } = await obtenerPerfilDeSesion(req.usuario.id);
    if (!perfil) return res.status(400).json({ error: 'No se encontró perfil de cliente' });

    const [ins] = await pool.query(
      'INSERT INTO resenas (id_cliente, id_servicio, calificacion, comentario) VALUES (?, ?, ?, ?)',
      [perfil.id_cliente, id_servicio, cal, String(comentario || '').trim() || null]
    );
    res.status(201).json({ id_resena: ins.insertId, mensaje: 'Reseña publicada exitosamente' });
  } catch (err) { responderError(res, err, 'guardar tu reseña'); }
};

/* PUT /api/admin/mis-resenas/:id */
const actualizarMiResena = async (req, res) => {
  try {
    const id_resena = Number(req.params.id);
    const { id_servicio, calificacion, comentario } = req.body || {};
    const cal = Number(calificacion);
    if (!id_servicio || !Number.isInteger(cal) || cal < 1 || cal > 5)
      return res.status(400).json({ error: 'Selecciona un servicio y una calificación de 1 a 5' });

    const { perfil } = await obtenerPerfilDeSesion(req.usuario.id);
    if (!perfil) return res.status(400).json({ error: 'No se encontró perfil de cliente' });

    const [r] = await pool.query(
      'UPDATE resenas SET id_servicio = ?, calificacion = ?, comentario = ? WHERE id_resena = ? AND id_cliente = ?',
      [id_servicio, cal, String(comentario || '').trim() || null, id_resena, perfil.id_cliente]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Reseña no encontrada en tu cuenta' });
    res.json({ mensaje: 'Reseña actualizada correctamente' });
  } catch (err) { responderError(res, err, 'actualizar tu reseña'); }
};

/* DELETE /api/admin/mis-resenas/:id */
const eliminarMiResena = async (req, res) => {
  try {
    const id_resena = Number(req.params.id);
    const { perfil } = await obtenerPerfilDeSesion(req.usuario.id);
    if (!perfil) return res.status(400).json({ error: 'No se encontró perfil de cliente' });

    const [r] = await pool.query(
      'DELETE FROM resenas WHERE id_resena = ? AND id_cliente = ?',
      [id_resena, perfil.id_cliente]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Reseña no encontrada en tu cuenta' });
    res.json({ mensaje: 'Reseña eliminada' });
  } catch (err) { responderError(res, err, 'eliminar tu reseña'); }
};

const actualizarMiPerfil = async (req, res) => {
  try {
    const nombre   = String(req.body?.nombre   || '').trim();
    const telefono = String(req.body?.telefono || '').trim() || null;
    const ciudad   = String(req.body?.ciudad   || '').trim() || null;
    const password = String(req.body?.password || '');

    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    if (password && password.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    if (password) {
      await pool.query('UPDATE usuarios SET nombre = ?, password_hash = ? WHERE id_usuario = ?', [
        nombre, hashPassword(password), req.usuario.id,
      ]);
    } else {
      await pool.query('UPDATE usuarios SET nombre = ? WHERE id_usuario = ?', [nombre, req.usuario.id]);
    }

    const { usuario: u, perfil } = await obtenerPerfilDeSesion(req.usuario.id);
    if (perfil) {
      await pool.query(
        'UPDATE clientes SET nombre = ?, telefono = ?, ciudad = ? WHERE id_cliente = ?',
        [nombre, telefono, ciudad, perfil.id_cliente]
      );
    }

    res.json({
      mensaje: 'Perfil actualizado',
      usuario: {
        id: req.usuario.id,
        nombre,
        email: u.email,
        rol: u.rol,
        id_cliente: perfil?.id_cliente || null,
        telefono,
        ciudad,
      },
    });
  } catch (err) { responderError(res, err, 'actualizar tu perfil'); }
};

/* ══════════ RESUMEN (Admin) ══════════ */
const resumen = async (_req, res) => {
  try {
    const [[r]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM pedidos)    AS pedidos,
        (SELECT COUNT(*) FROM pagos)      AS pagos,
        (SELECT COUNT(*) FROM servicios)  AS servicios,
        (SELECT COUNT(*) FROM categorias) AS categorias,
        (SELECT COUNT(*) FROM clientes)   AS clientes,
        (SELECT COUNT(*) FROM empleados)  AS empleados,
        (SELECT COUNT(*) FROM resenas)    AS resenas,
        (SELECT COUNT(*) FROM usuarios)   AS usuarios,
        (SELECT ROUND(AVG(calificacion), 1) FROM resenas) AS promedio_calificacion,
        (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE estado_pago = 'pagado') AS ingresos_cobrados`);
    res.json(r);
  } catch (err) { responderError(res, err, 'obtener el resumen'); }
};

/* ══════════ CRUD GENÉRICO (Admin) ══════════ */
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

module.exports = {
  ENTIDADES,
  login,
  registro,
  miCuenta,
  crearMiPedido,
  actualizarMiPedido,
  eliminarMiPedido,
  crearMiResena,
  actualizarMiResena,
  eliminarMiResena,
  actualizarMiPerfil,
  resumen,
  listar,
  crear,
  actualizar,
  eliminar,
};
