/* ═══════════════════════════════════════════════
   ImpulsaMarket — admin.js
   Acceso (Login / Registro), Panel Admin y Portal de Clientes
   ═══════════════════════════════════════════════ */

const API = 'http://localhost:3000/api/admin';
const $   = id => document.getElementById(id);

let token  = localStorage.getItem('im_token') || sessionStorage.getItem('im_token');
let sesion = JSON.parse(localStorage.getItem('im_usuario') || sessionStorage.getItem('im_usuario') || 'null');
let actual = null;          // entidad o sección abierta
let editId = null;          // id en edición (null = creando)
let modoCliente = null;     // 'pedido' | 'resena' cuando el modal lo abre un cliente
let datosCliente = null;    // cache de /mi-cuenta
const cache = {};           // listas ya cargadas (para los <select> de admin)

/* ── Escapar texto antes de insertarlo como HTML ── */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ════════════════════════════════════════════
   CONFIGURACIÓN DE CADA TABLA (ADMIN)
════════════════════════════════════════════ */
const si      = v => `<span class="etiqueta ${v ? 'si' : 'no'}">${v ? 'Sí' : 'No'}</span>`;
const rol     = v => `<span class="etiqueta ${esc(v)}">${esc(v)}</span>`;
const fecha   = v => v ? new Date(v).toLocaleDateString('es-CO') : '';
const cop     = v => '$' + Number(v || 0).toLocaleString('es-CO');
const estrellas = n => `<span class="estrellas">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;

const estadoPedidoFmt = v => {
  const map = {
    en_proceso: ['empleado', '⏳ En proceso'],
    entregado:  ['cliente',  '✅ Entregado'],
    cancelado:  ['no',       '❌ Cancelado'],
  };
  const [cls, txt] = map[v] || ['', esc(v)];
  return `<span class="etiqueta ${cls}">${txt}</span>`;
};

const estadoPagoFmt = v => {
  const map = {
    pendiente: ['empleado', '⏳ Pendiente'],
    pagado:    ['cliente',  '✅ Pagado'],
    rechazado: ['no',       '❌ Rechazado'],
  };
  const [cls, txt] = map[v] || ['', esc(v)];
  return `<span class="etiqueta ${cls}">${txt}</span>`;
};

const ENT = {
  pedidos: {
    titulo: 'Pedidos', pk: 'id_pedido',
    cols: [
      ['id_pedido','ID'],
      ['cliente','Cliente'],
      ['servicio','Servicio'],
      ['empleado','Empleado', v => v ? esc(v) : '<span class="ayuda">Sin asignar</span>'],
      ['estado','Estado', estadoPedidoFmt],
      ['detalles','Detalles'],
      ['fecha_pedido','Fecha', fecha],
    ],
    campos: [
      { n:'id_cliente',  l:'Cliente',  t:'select', req:true,  de:'clientes',  valor:'id_cliente',  texto:r => `${r.nombre} (${r.email})` },
      { n:'id_servicio', l:'Servicio', t:'select', req:true,  de:'servicios', valor:'id_servicio', texto:r => `${r.nombre} — $${Number(r.precio_base).toLocaleString('es-CO')}` },
      { n:'id_empleado', l:'Empleado asignado', t:'select', req:false, de:'empleados', valor:'id_empleado', texto:r => `${r.nombre} — ${r.cargo || 'Diseñador'}` },
      { n:'estado',      l:'Estado',   t:'select', req:true,  opciones:[['en_proceso','En proceso'],['entregado','Entregado'],['cancelado','Cancelado']], defecto:'en_proceso' },
      { n:'detalles',    l:'Detalles', t:'textarea' },
    ],
  },
  pagos: {
    titulo: 'Pagos', pk: 'id_pago',
    cols: [
      ['id_pago','ID'],
      ['pedido_desc','Pedido'],
      ['monto','Monto', cop],
      ['metodo_pago','Método', v => `<span class="etiqueta">${esc(v)}</span>`],
      ['estado_pago','Estado', estadoPagoFmt],
      ['observacion','Observación'],
      ['fecha_pago','Fecha', fecha],
    ],
    campos: [
      { n:'id_pedido',   l:'Pedido', t:'select', req:true, de:'pedidos', valor:'id_pedido', texto:r => `#${r.id_pedido} — ${r.cliente} (${r.servicio})` },
      { n:'monto',       l:'Monto (COP)', t:'number', req:true },
      { n:'metodo_pago', l:'Método de pago', t:'select', req:true, opciones:[['efectivo','Efectivo'],['transferencia','Transferencia'],['nequi','Nequi'],['daviplata','Daviplata'],['otro','Otro']], defecto:'efectivo' },
      { n:'estado_pago', l:'Estado del pago', t:'select', req:true, opciones:[['pendiente','Pendiente'],['pagado','Pagado'],['rechazado','Rechazado']], defecto:'pendiente' },
      { n:'observacion', l:'Observación', t:'text' },
    ],
  },
  servicios: {
    titulo: 'Servicios', pk: 'id_servicio',
    cols: [['id_servicio','ID'], ['nombre','Servicio'], ['categoria','Categoría'],
           ['precio_base','Precio', cop], ['activo','Activo', si]],
    campos: [
      { n:'id_categoria', l:'Categoría', t:'select', req:true, de:'categorias', valor:'id_categoria', texto:r => r.nombre },
      { n:'nombre', l:'Nombre', t:'text', req:true },
      { n:'descripcion', l:'Descripción', t:'textarea' },
      { n:'precio_base', l:'Precio (COP)', t:'number', req:true },
      { n:'activo', l:'Activo', t:'select', opciones:[[1,'Sí'],[0,'No']], defecto:1 },
    ],
  },
  categorias: {
    titulo: 'Categorías', pk: 'id_categoria',
    cols: [['id_categoria','ID'], ['nombre','Nombre'], ['descripcion','Descripción']],
    campos: [
      { n:'nombre', l:'Nombre', t:'text', req:true },
      { n:'descripcion', l:'Descripción', t:'textarea' },
    ],
  },
  clientes: {
    titulo: 'Clientes', pk: 'id_cliente',
    cols: [
      ['id_cliente','ID'],
      ['nombre','Nombre'],
      ['email','Correo'],
      ['telefono','Teléfono'],
      ['ciudad','Ciudad'],
      ['usuario_email','Cuenta vinculada', v => v ? `<span class="etiqueta cliente">${esc(v)}</span>` : '<span class="ayuda">Sin cuenta</span>'],
    ],
    campos: [
      { n:'nombre',     l:'Nombre completo', t:'text',  req:true },
      { n:'email',      l:'Correo electrónico', t:'email', req:true },
      { n:'telefono',   l:'Teléfono', t:'text' },
      { n:'ciudad',     l:'Ciudad',   t:'text' },
      { n:'id_usuario', l:'Usuario vinculado (opcional)', t:'select', req:false, de:'usuarios', valor:'id_usuario', texto:r => `${r.nombre} — ${r.email} (${r.rol})` },
    ],
  },
  empleados: {
    titulo: 'Empleados', pk: 'id_empleado',
    cols: [
      ['id_empleado','ID'],
      ['nombre','Nombre'],
      ['cargo','Cargo'],
      ['email','Correo'],
      ['usuario_email','Cuenta vinculada', v => v ? `<span class="etiqueta empleado">${esc(v)}</span>` : '<span class="ayuda">Sin cuenta</span>'],
      ['activo','Activo', si],
    ],
    campos: [
      { n:'nombre',     l:'Nombre completo', t:'text',  req:true },
      { n:'cargo',      l:'Cargo',           t:'text',  defecto:'Diseñador' },
      { n:'email',      l:'Correo electrónico', t:'email', req:true },
      { n:'id_usuario', l:'Usuario vinculado (opcional)', t:'select', req:false, de:'usuarios', valor:'id_usuario', texto:r => `${r.nombre} — ${r.email} (${r.rol})` },
      { n:'activo',     l:'Activo', t:'select', opciones:[[1,'Sí'],[0,'No']], defecto:1 },
    ],
  },
  resenas: {
    titulo: 'Reseñas', pk: 'id_resena',
    cols: [['id_resena','ID'], ['cliente','Cliente'], ['servicio','Servicio'],
           ['calificacion','Calificación', estrellas], ['comentario','Comentario'], ['fecha','Fecha', fecha]],
    campos: [
      { n:'id_cliente', l:'Cliente', t:'select', req:true, de:'clientes', valor:'id_cliente', texto:r => `${r.nombre} (${r.email})` },
      { n:'id_servicio', l:'Servicio', t:'select', req:true, de:'servicios', valor:'id_servicio', texto:r => r.nombre },
      { n:'calificacion', l:'Calificación', t:'select', req:true, opciones:[[5,'5 — Excelente'],[4,'4 — Muy buena'],[3,'3 — Buena'],[2,'2 — Regular'],[1,'1 — Mala']], defecto:5 },
      { n:'comentario', l:'Comentario', t:'textarea' },
    ],
  },
  usuarios: {
    titulo: 'Usuarios', pk: 'id_usuario',
    cols: [['id_usuario','ID'], ['nombre','Nombre'], ['email','Correo'], ['rol','Rol', rol], ['activo','Activo', si], ['fecha_registro','Registro', fecha]],
    campos: [
      { n:'nombre', l:'Nombre', t:'text', req:true },
      { n:'email', l:'Correo', t:'email', req:true },
      { n:'password', l:'Contraseña', t:'password', soloCrear:true, ayuda:'Mínimo 6 caracteres. Al editar, déjala vacía para no cambiarla.' },
      { n:'rol', l:'Rol', t:'select', opciones:[['cliente','Cliente'],['empleado','Empleado'],['admin','Administrador']], defecto:'cliente' },
      { n:'activo', l:'Activo', t:'select', opciones:[[1,'Sí'],[0,'No']], defecto:1 },
    ],
  },
};

/* ════════════════════════════════════════════
   PETICIONES
════════════════════════════════════════════ */
async function api(metodo, ruta, body) {
  const res = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && ruta !== '/login' && ruta !== '/registro') {
    cerrarSesion();
    throw new Error('Tu sesión venció, entra de nuevo');
  }
  if (!res.ok) throw new Error(data.error || 'Error en el servidor');
  return data;
}

function toast(msg, tipo = '') {
  const t = $('toast');
  t.textContent = msg; t.className = `toast ${tipo} show`;
  setTimeout(() => t.classList.remove('show'), 3200);
}

function guardarSesion(nuevoToken, nuevoUsuario) {
  token  = nuevoToken;
  sesion = nuevoUsuario;
  localStorage.setItem('im_token', token);
  localStorage.setItem('im_usuario', JSON.stringify(sesion));
  sessionStorage.setItem('im_token', token);
  sessionStorage.setItem('im_usuario', JSON.stringify(sesion));
}

/* ════════════════════════════════════════════
   PESTAÑAS LOGIN / REGISTRO
════════════════════════════════════════════ */
function cambiarModoAuth(modo) {
  const esReg = modo === 'registro';
  $('tab-login').classList.toggle('activo', !esReg);
  $('tab-registro').classList.toggle('activo', esReg);
  $('form-login').style.display = esReg ? 'none' : '';
  $('form-registro-cliente').style.display = esReg ? '' : 'none';
  $('auth-sub').textContent = esReg
    ? 'Crea tu cuenta de cliente para gestionar pedidos y reseñas'
    : 'Inicia sesión como cliente o administrador';
  $('login-error').textContent = '';
  $('reg-error').textContent = '';
}

$('tab-login').addEventListener('click', () => cambiarModoAuth('login'));
$('tab-registro').addEventListener('click', () => cambiarModoAuth('registro'));

if (window.location.hash === '#registro') cambiarModoAuth('registro');

/* ════════════════════════════════════════════
   INICIAR SESIÓN Y REGISTRO
════════════════════════════════════════════ */
$('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  $('login-error').textContent = '';
  try {
    const d = await api('POST', '/login', {
      email: $('login-email').value.trim(),
      password: $('login-pass').value,
    });
    guardarSesion(d.token, d.usuario);
    $('login-pass').value = '';
    mostrarPanel();
  } catch (err) {
    $('login-error').textContent = err.message === 'Failed to fetch'
      ? 'No se pudo conectar con el servidor (¿está corriendo en el puerto 3000?)' : err.message;
  }
});

$('form-registro-cliente').addEventListener('submit', async e => {
  e.preventDefault();
  $('reg-error').textContent = '';
  try {
    const d = await api('POST', '/registro', {
      nombre:   $('reg-nombre').value.trim(),
      email:    $('reg-email').value.trim(),
      telefono: $('reg-telefono').value.trim(),
      ciudad:   $('reg-ciudad').value.trim(),
      password: $('reg-pass').value,
    });
    guardarSesion(d.token, d.usuario);
    $('reg-pass').value = '';
    toast('🎉 ¡Bienvenido a ImpulsaMarket!', 'success');
    mostrarPanel();
  } catch (err) {
    $('reg-error').textContent = err.message === 'Failed to fetch'
      ? 'No se pudo conectar con el servidor (¿está corriendo en el puerto 3000?)' : err.message;
  }
});

function cerrarSesion() {
  token = null; sesion = null; datosCliente = null;
  localStorage.removeItem('im_token'); localStorage.removeItem('im_usuario');
  sessionStorage.removeItem('im_token'); sessionStorage.removeItem('im_usuario');
  $('vista-panel').style.display = 'none';
  $('vista-login').style.display = '';
}
$('btn-salir').addEventListener('click', cerrarSesion);

function mostrarPanel() {
  $('vista-login').style.display = 'none';
  $('vista-panel').style.display = '';
  $('admin-nombre').innerHTML = `<strong>${esc(sesion?.nombre || '')}</strong><br><span class="etiqueta ${esc(sesion?.rol || 'cliente')}" style="margin-top:4px">${esc(sesion?.rol || 'cliente')}</span>`;

  if (sesion?.rol === 'admin') {
    $('panel-rol-sub').textContent = 'Administración';
    $('admin-menu').innerHTML =
      `<button data-sec="resumen">📊 Resumen</button>` +
      Object.entries(ENT).map(([k, v]) => `<button data-sec="${k}">${v.titulo}</button>`).join('');
    abrirSeccion('resumen');
  } else {
    $('panel-rol-sub').textContent = 'Mi Cuenta';
    $('admin-menu').innerHTML = `
      <button data-cli="mis-pedidos">📦 Mis Pedidos</button>
      <button data-cli="mis-resenas">⭐ Mis Reseñas</button>
      <button data-cli="mi-perfil">👤 Mis Datos</button>
    `;
    abrirSeccionCliente('mis-pedidos');
  }
}

$('admin-menu').addEventListener('click', e => {
  const bAdmin = e.target.closest('button[data-sec]');
  if (bAdmin) return abrirSeccion(bAdmin.dataset.sec);
  const bCli = e.target.closest('button[data-cli]');
  if (bCli) return abrirSeccionCliente(bCli.dataset.cli);
});

/* ════════════════════════════════════════════
   PORTAL DEL CLIENTE (CRUD COMPLETO)
════════════════════════════════════════════ */
function botonesAccionPedidoCliente(p) {
  const btns = [];
  if (p.estado === 'en_proceso') {
    btns.push(`<button class="btn-mini" data-cli-editar-ped="${p.id_pedido}">✏️ Editar</button>`);
    btns.push(`<button class="btn-mini peligro" data-cli-cancelar-ped="${p.id_pedido}">🚫 Cancelar</button>`);
  } else if (p.estado === 'entregado') {
    btns.push(`<button class="btn-mini" data-cli-calificar-svc="${p.id_servicio}">⭐ Calificar</button>`);
  } else if (p.estado === 'cancelado') {
    btns.push(`<button class="btn-mini" data-cli-reactivar-ped="${p.id_pedido}">🔄 Reactivar</button>`);
    if (p.estado_pago !== 'pagado') {
      btns.push(`<button class="btn-mini peligro" data-cli-borrar-ped="${p.id_pedido}">🗑️ Borrar</button>`);
    }
  }
  return btns.join('');
}

async function abrirSeccionCliente(sec) {
  actual = sec;
  document.querySelectorAll('#admin-menu button').forEach(b => b.classList.toggle('activo', b.dataset.cli === sec));
  try {
    datosCliente = await api('GET', '/mi-cuenta');
    guardarSesion(token, { ...sesion, ...datosCliente.usuario });

    if (sec === 'mi-perfil') {
      $('seccion-tabla').style.display = 'none';
      $('seccion-resumen').style.display = '';
      const u = datosCliente.usuario;
      $('seccion-resumen').innerHTML = `
        <h1>Mis Datos</h1>
        <form id="form-mi-perfil" class="perfil-card">
          <div class="form-group">
            <label>Nombre completo</label>
            <input type="text" id="perf-nombre" value="${esc(u.nombre)}" required>
          </div>
          <div class="form-group">
            <label>Correo electrónico</label>
            <input type="email" value="${esc(u.email)}" disabled style="opacity:.6">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Teléfono</label>
              <input type="text" id="perf-telefono" value="${esc(u.telefono || '')}">
            </div>
            <div class="form-group">
              <label>Ciudad</label>
              <input type="text" id="perf-ciudad" value="${esc(u.ciudad || '')}">
            </div>
          </div>
          <div class="form-group">
            <label>Nueva contraseña (opcional)</label>
            <input type="password" id="perf-pass" minlength="6" placeholder="Déjala vacía para no cambiarla">
          </div>
          <button type="submit" class="btn-gold" style="width:100%;margin-top:8px">Guardar cambios</button>
        </form>
      `;
      $('form-mi-perfil').addEventListener('submit', async ev => {
        ev.preventDefault();
        try {
          const r = await api('PUT', '/mi-perfil', {
            nombre:   $('perf-nombre').value.trim(),
            telefono: $('perf-telefono').value.trim(),
            ciudad:   $('perf-ciudad').value.trim(),
            password: $('perf-pass').value,
          });
          guardarSesion(token, { ...sesion, ...r.usuario });
          $('admin-nombre').innerHTML = `<strong>${esc(sesion.nombre)}</strong><br><span class="etiqueta ${esc(sesion.rol)}" style="margin-top:4px">${esc(sesion.rol)}</span>`;
          toast('✅ Datos actualizados', 'success');
          abrirSeccionCliente('mi-perfil');
        } catch (err) { toast('❌ ' + err.message, 'error'); }
      });
      return;
    }

    $('seccion-resumen').style.display = 'none';
    $('seccion-tabla').style.display = '';
    const tabla = $('tabla');

    if (sec === 'mis-pedidos') {
      $('tabla-titulo').textContent = 'Mis Pedidos';
      $('btn-nuevo').textContent = '+ Solicitar Pedido';
      const lista = datosCliente.pedidos || [];
      if (!lista.length) {
        tabla.innerHTML = `<tbody><tr><td class="vacio">Aún no tienes pedidos registrados. ¡Haz clic en "+ Solicitar Pedido" para crear el primero!</td></tr></tbody>`;
        return;
      }
      tabla.innerHTML = `
        <thead>
          <tr><th>ID</th><th>Servicio</th><th>Categoría</th><th>Precio base</th><th>Empleado</th><th>Estado</th><th>Pago</th><th>Detalles</th><th>Fecha</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          ${lista.map(p => `
            <tr>
              <td>#${p.id_pedido}</td>
              <td>${esc(p.servicio)}</td>
              <td>${esc(p.categoria)}</td>
              <td>${cop(p.precio_base)}</td>
              <td>${p.empleado ? esc(p.empleado) : '<span class="ayuda">Por asignar</span>'}</td>
              <td>${estadoPedidoFmt(p.estado)}</td>
              <td>${p.estado_pago ? estadoPagoFmt(p.estado_pago) : '<span class="ayuda">Sin registro</span>'}</td>
              <td>${esc(p.detalles || '—')}</td>
              <td>${fecha(p.fecha_pedido)}</td>
              <td class="acciones">${botonesAccionPedidoCliente(p)}</td>
            </tr>`).join('')}
        </tbody>`;
    } else if (sec === 'mis-resenas') {
      $('tabla-titulo').textContent = 'Mis Reseñas';
      $('btn-nuevo').textContent = '+ Publicar Reseña';
      const lista = datosCliente.resenas || [];
      if (!lista.length) {
        tabla.innerHTML = `<tbody><tr><td class="vacio">Aún no has escrito reseñas. ¡Comparte tu experiencia con "+ Publicar Reseña"!</td></tr></tbody>`;
        return;
      }
      tabla.innerHTML = `
        <thead>
          <tr><th>Servicio</th><th>Calificación</th><th>Comentario</th><th>Fecha</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          ${lista.map(r => `
            <tr>
              <td>${esc(r.servicio)}</td>
              <td>${estrellas(r.calificacion)}</td>
              <td>${esc(r.comentario || '—')}</td>
              <td>${fecha(r.fecha)}</td>
              <td class="acciones">
                <button class="btn-mini" data-cli-editar-res="${r.id_resena}">✏️ Editar</button>
                <button class="btn-mini peligro" data-cli-borrar-res="${r.id_resena}">🗑️ Borrar</button>
              </td>
            </tr>`).join('')}
        </tbody>`;
    }
  } catch (err) { toast('❌ ' + err.message, 'error'); }
}

function abrirModalCliente(idEdicion = null, idServicioPreseleccionado = null) {
  editId = idEdicion;
  const svcs = datosCliente?.servicios || [];

  if (actual === 'mis-pedidos' && !idServicioPreseleccionado) {
    modoCliente = 'pedido';
    const ped = idEdicion ? (datosCliente?.pedidos || []).find(p => p.id_pedido === idEdicion) : null;
    const pagado = ped?.estado_pago === 'pagado';
    const opts = svcs.map(s => `<option value="${s.id_servicio}" ${String(s.id_servicio) === String(ped?.id_servicio) ? 'selected' : ''}>${esc(s.nombre)} — ${cop(s.precio_base)}</option>`).join('');

    $('modal-title').textContent = idEdicion ? `Editar Pedido #${idEdicion}` : 'Solicitar Nuevo Pedido';
    $('form-registro').innerHTML = `
      <div class="form-group">
        <label for="cli-servicio">Servicio requerido</label>
        <select id="cli-servicio" required ${pagado ? 'disabled style="opacity:.6"' : ''}>
          <option value="">— Selecciona un servicio —</option>
          ${opts}
        </select>
        ${pagado ? '<span class="ayuda">El servicio no se puede cambiar porque ya tiene pago registrado.</span>' : ''}
      </div>
      <div class="form-group">
        <label for="cli-detalles">Detalles de tu proyecto</label>
        <textarea id="cli-detalles" placeholder="Cuéntanos qué necesitas, colores, ideas...">${esc(ped?.detalles || '')}</textarea>
      </div>
      <button type="submit" class="btn-gold" style="width:100%;margin-top:6px">${idEdicion ? 'Guardar Cambios' : 'Enviar Pedido'}</button>
    `;
    $('modal-overlay').classList.add('active');
    return;
  }

  // Crear o Editar Reseña (también cuando viene de "⭐ Calificar" en un pedido entregado)
  modoCliente = 'resena';
  const res = idEdicion ? (datosCliente?.resenas || []).find(r => r.id_resena === idEdicion) : null;
  const svcSel = res?.id_servicio ?? idServicioPreseleccionado ?? '';
  const calSel = res?.calificacion ?? 5;
  const opts = svcs.map(s => `<option value="${s.id_servicio}" ${String(s.id_servicio) === String(svcSel) ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('');

  $('modal-title').textContent = idEdicion ? 'Editar Reseña' : 'Publicar Reseña';
  $('form-registro').innerHTML = `
    <div class="form-group">
      <label for="cli-servicio">Servicio</label>
      <select id="cli-servicio" required>
        <option value="">— Selecciona un servicio —</option>
        ${opts}
      </select>
    </div>
    <div class="form-group">
      <label for="cli-calificacion">Calificación</label>
      <select id="cli-calificacion" required>
        <option value="5" ${calSel === 5 ? 'selected' : ''}>5 — Excelente ★★★★★</option>
        <option value="4" ${calSel === 4 ? 'selected' : ''}>4 — Muy buena ★★★★☆</option>
        <option value="3" ${calSel === 3 ? 'selected' : ''}>3 — Buena ★★★☆☆</option>
        <option value="2" ${calSel === 2 ? 'selected' : ''}>2 — Regular ★★☆☆☆</option>
        <option value="1" ${calSel === 1 ? 'selected' : ''}>1 — Mala ★☆☆☆☆</option>
      </select>
    </div>
    <div class="form-group">
      <label for="cli-comentario">Tu comentario</label>
      <textarea id="cli-comentario" placeholder="¿Cómo fue tu experiencia con nosotros?" required>${esc(res?.comentario || '')}</textarea>
    </div>
    <button type="submit" class="btn-gold" style="width:100%;margin-top:6px">${idEdicion ? 'Guardar Cambios' : 'Publicar Reseña'}</button>
  `;
  $('modal-overlay').classList.add('active');
}

/* ════════════════════════════════════════════
   SECCIONES (ADMINISTRADOR)
════════════════════════════════════════════ */
async function abrirSeccion(sec) {
  modoCliente = null;
  $('btn-nuevo').textContent = '+ Nuevo';
  document.querySelectorAll('#admin-menu button').forEach(b => b.classList.toggle('activo', b.dataset.sec === sec));
  try {
    if (sec === 'resumen') return await verResumen();
    actual = sec;
    $('seccion-resumen').style.display = 'none';
    $('seccion-tabla').style.display = '';
    $('tabla-titulo').textContent = ENT[sec].titulo;
    await cargarTabla();
  } catch (err) { toast('❌ ' + err.message, 'error'); }
}

async function verResumen() {
  actual = null;
  $('seccion-tabla').style.display = 'none';
  $('seccion-resumen').style.display = '';
  const r = await api('GET', '/resumen');
  const items = [
    ['pedidos','Pedidos'], ['pagos','Pagos'], ['servicios','Servicios'],
    ['categorias','Categorías'], ['clientes','Clientes'], ['empleados','Empleados'],
    ['resenas','Reseñas'], ['usuarios','Usuarios'],
  ];
  $('seccion-resumen').innerHTML = `
    <h1>Resumen del Sistema</h1>
    <div class="resumen-grid">
      ${items.map(([k, l]) => `<div class="resumen-card"><div class="resumen-n">${esc(r[k])}</div><div class="resumen-l">${l}</div></div>`).join('')}
      <div class="resumen-card"><div class="resumen-n">${r.promedio_calificacion ?? '—'}</div><div class="resumen-l">Calificación promedio</div></div>
      <div class="resumen-card"><div class="resumen-n" style="font-size:1.55rem">${cop(r.ingresos_cobrados)}</div><div class="resumen-l">Ingresos cobrados</div></div>
    </div>`;
}

async function cargarTabla() {
  const cfg = ENT[actual];
  const filas = await api('GET', '/' + actual);
  cache[actual] = filas;
  const tabla = $('tabla');
  if (!filas.length) {
    tabla.innerHTML = `<tbody><tr><td class="vacio">No hay registros todavía.</td></tr></tbody>`;
    return;
  }
  tabla.innerHTML = `
    <thead><tr>${cfg.cols.map(c => `<th>${c[1]}</th>`).join('')}<th>Acciones</th></tr></thead>
    <tbody>${filas.map(f => `
      <tr>
        ${cfg.cols.map(([k, , fmt]) => `<td>${fmt && k !== 'comentario' ? fmt(f[k]) : esc(f[k])}</td>`).join('')}
        <td class="acciones">
          <button class="btn-mini" data-editar="${f[cfg.pk]}">✏️ Editar</button>
          <button class="btn-mini peligro" data-borrar="${f[cfg.pk]}">🗑️ Borrar</button>
        </td>
      </tr>`).join('')}
    </tbody>`;
}

/* ── Eventos de botones en la tabla (tanto Admin como Cliente) ── */
$('tabla').addEventListener('click', async e => {
  // Acciones Admin
  const ed = e.target.closest('[data-editar]');
  const bo = e.target.closest('[data-borrar]');
  if (ed) return abrirFormulario(Number(ed.dataset.editar));
  if (bo) return borrar(Number(bo.dataset.borrar));

  // Acciones Cliente — Pedidos
  const cliEdPed = e.target.closest('[data-cli-editar-ped]');
  if (cliEdPed) return abrirModalCliente(Number(cliEdPed.dataset.cliEditarPed));

  const cliCanPed = e.target.closest('[data-cli-cancelar-ped]');
  if (cliCanPed) {
    const id = Number(cliCanPed.dataset.cliCancelarPed);
    if (!confirm(`¿Seguro que deseas cancelar el pedido #${id}?`)) return;
    try {
      await api('PUT', `/mis-pedidos/${id}`, { accion: 'cancelar' });
      toast('🚫 Pedido cancelado', 'success');
      await abrirSeccionCliente('mis-pedidos');
    } catch (err) { toast('❌ ' + err.message, 'error'); }
    return;
  }

  const cliReacPed = e.target.closest('[data-cli-reactivar-ped]');
  if (cliReacPed) {
    const id = Number(cliReacPed.dataset.cliReactivarPed);
    try {
      await api('PUT', `/mis-pedidos/${id}`, { accion: 'reactivar' });
      toast('🔄 Pedido reactivado y puesto en proceso', 'success');
      await abrirSeccionCliente('mis-pedidos');
    } catch (err) { toast('❌ ' + err.message, 'error'); }
    return;
  }

  const cliDelPed = e.target.closest('[data-cli-borrar-ped]');
  if (cliDelPed) {
    const id = Number(cliDelPed.dataset.cliBorrarPed);
    if (!confirm(`¿Eliminar permanentemente el pedido #${id}?`)) return;
    try {
      await api('DELETE', `/mis-pedidos/${id}`);
      toast('🗑️ Pedido eliminado', 'success');
      await abrirSeccionCliente('mis-pedidos');
    } catch (err) { toast('❌ ' + err.message, 'error'); }
    return;
  }

  const cliCalSvc = e.target.closest('[data-cli-calificar-svc]');
  if (cliCalSvc) {
    return abrirModalCliente(null, Number(cliCalSvc.dataset.cliCalificarSvc));
  }

  // Acciones Cliente — Reseñas
  const cliEdRes = e.target.closest('[data-cli-editar-res]');
  if (cliEdRes) return abrirModalCliente(Number(cliEdRes.dataset.cliEditarRes));

  const cliDelRes = e.target.closest('[data-cli-borrar-res]');
  if (cliDelRes) {
    const id = Number(cliDelRes.dataset.cliBorrarRes);
    if (!confirm('¿Eliminar esta reseña permanentemente?')) return;
    try {
      await api('DELETE', `/mis-resenas/${id}`);
      toast('🗑️ Reseña eliminada', 'success');
      await abrirSeccionCliente('mis-resenas');
    } catch (err) { toast('❌ ' + err.message, 'error'); }
  }
});

$('btn-nuevo').addEventListener('click', () => {
  if (sesion?.rol !== 'admin') return abrirModalCliente(null);
  abrirFormulario(null);
});

/* ════════════════════════════════════════════
   FORMULARIO (crear / editar)
════════════════════════════════════════════ */
async function opcionesDe(campo) {
  if (campo.opciones) return campo.opciones;
  const lista = await api('GET', '/' + campo.de);
  return lista.map(r => [r[campo.valor], campo.texto(r)]);
}

async function abrirFormulario(id) {
  modoCliente = null;
  const cfg = ENT[actual];
  editId = id;
  const registro = id ? cache[actual].find(r => r[cfg.pk] === id) : {};
  $('modal-title').textContent = (id ? 'Editar ' : 'Nuevo registro — ') + cfg.titulo;

  try {
    const html = [];
    for (const c of cfg.campos) {
      const val = id ? (registro[c.n] ?? '') : (c.defecto ?? '');
      const req = c.req || (c.n === 'password' && !id) ? 'required' : '';
      let input;
      if (c.t === 'select') {
        const ops = await opcionesDe(c);
        const placeholder = c.de ? (c.req ? '<option value="">— Selecciona —</option>' : '<option value="">— Sin asignar —</option>') : '';
        input = `<select id="f-${c.n}" ${req}>
          ${placeholder}
          ${ops.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select>`;
      } else if (c.t === 'textarea') {
        input = `<textarea id="f-${c.n}">${esc(val)}</textarea>`;
      } else {
        const v = c.t === 'password' ? '' : esc(val);
        input = `<input type="${c.t}" id="f-${c.n}" value="${v}" ${req} ${c.t === 'number' ? 'min="0" step="any"' : ''} ${c.t === 'password' ? 'autocomplete="new-password" minlength="6"' : ''}>`;
        if (c.t === 'password' && id) input = input.replace(' required', '').replace(' minlength="6"', '');
      }
      html.push(`<div class="form-group"><label for="f-${c.n}">${c.l}</label>${input}${c.ayuda ? `<span class="ayuda">${c.ayuda}</span>` : ''}</div>`);
    }
    $('form-registro').innerHTML = html.join('') +
      `<button type="submit" class="btn-gold" style="width:100%;margin-top:6px">Guardar</button>`;
    $('modal-overlay').classList.add('active');
  } catch (err) { toast('❌ ' + err.message, 'error'); }
}

$('form-registro').addEventListener('submit', async e => {
  e.preventDefault();

  // Si el modal fue abierto desde el Portal de Cliente:
  if (modoCliente === 'pedido') {
    const body = {
      id_servicio: $('cli-servicio').value,
      detalles:    $('cli-detalles').value.trim(),
    };
    try {
      if (editId) await api('PUT', `/mis-pedidos/${editId}`, body);
      else        await api('POST', '/mis-pedidos', body);
      cerrarModal();
      toast(editId ? '✅ Pedido actualizado' : '✅ Pedido registrado con éxito', 'success');
      await abrirSeccionCliente('mis-pedidos');
    } catch (err) { toast('❌ ' + err.message, 'error'); }
    return;
  }
  if (modoCliente === 'resena') {
    const body = {
      id_servicio:  $('cli-servicio').value,
      calificacion: $('cli-calificacion').value,
      comentario:   $('cli-comentario').value.trim(),
    };
    try {
      if (editId) await api('PUT', `/mis-resenas/${editId}`, body);
      else        await api('POST', '/mis-resenas', body);
      cerrarModal();
      toast(editId ? '✅ Reseña actualizada' : '⭐ ¡Gracias por tu reseña!', 'success');
      await abrirSeccionCliente(actual === 'mis-resenas' ? 'mis-resenas' : 'mis-pedidos');
    } catch (err) { toast('❌ ' + err.message, 'error'); }
    return;
  }

  // Modo Administrador:
  const cfg = ENT[actual];
  const body = {};
  for (const c of cfg.campos) {
    const el = $('f-' + c.n);
    if (!el) continue;
    if (c.n === 'password' && editId && !el.value) continue;
    body[c.n] = el.value;
  }
  try {
    if (editId) await api('PUT', `/${actual}/${editId}`, body);
    else        await api('POST', `/${actual}`, body);
    cerrarModal();
    toast(editId ? '✅ Registro actualizado' : '✅ Registro creado', 'success');
    await cargarTabla();
  } catch (err) { toast('❌ ' + err.message, 'error'); }
});

async function borrar(id) {
  if (!confirm('¿Eliminar este registro permanentemente?')) return;
  try {
    await api('DELETE', `/${actual}/${id}`);
    toast('🗑️ Registro eliminado', 'success');
    await cargarTabla();
  } catch (err) { toast('❌ ' + err.message, 'error'); }
}

function cerrarModal() { $('modal-overlay').classList.remove('active'); }
$('modal-cerrar').addEventListener('click', cerrarModal);
$('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) cerrarModal(); });

/* ── Inicio: si ya hay sesión guardada, entrar directo ── */
if (token && sesion) mostrarPanel();
