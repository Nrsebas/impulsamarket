/* ═══════════════════════════════════════════════
   ImpulsaMarket — admin.js
   Panel de administración → API Node.js → MySQL (impulsamarket_v2)
   ═══════════════════════════════════════════════ */

const API = 'http://localhost:3000/api/admin';
const $   = id => document.getElementById(id);

let token  = sessionStorage.getItem('im_token');
let sesion = JSON.parse(sessionStorage.getItem('im_usuario') || 'null');
let actual = null;          // entidad abierta
let editId = null;          // id en edición (null = creando)
const cache = {};           // listas ya cargadas (para los <select>)

/* ── Escapar texto antes de insertarlo como HTML ── */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ════════════════════════════════════════════
   CONFIGURACIÓN DE CADA TABLA
════════════════════════════════════════════ */
const si = v => `<span class="etiqueta ${v ? 'si' : 'no'}">${v ? 'Sí' : 'No'}</span>`;
const rol = v => `<span class="etiqueta ${esc(v)}">${esc(v)}</span>`;
const fecha = v => v ? new Date(v).toLocaleDateString('es-CO') : '';
const estrellas = n => `<span class="estrellas">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;

const ENT = {
  categorias: {
    titulo: 'Categorías', pk: 'id_categoria',
    cols: [['id_categoria','ID'], ['nombre','Nombre'], ['descripcion','Descripción']],
    campos: [
      { n:'nombre', l:'Nombre', t:'text', req:true },
      { n:'descripcion', l:'Descripción', t:'textarea' },
    ],
  },
  servicios: {
    titulo: 'Servicios', pk: 'id_servicio',
    cols: [['id_servicio','ID'], ['nombre','Servicio'], ['categoria','Categoría'],
           ['precio','Precio', v => '$' + Number(v).toLocaleString('es-CO')], ['activo','Activo', si]],
    campos: [
      { n:'id_categoria', l:'Categoría', t:'select', req:true, de:'categorias', valor:'id_categoria', texto:r => r.nombre },
      { n:'nombre', l:'Nombre', t:'text', req:true },
      { n:'descripcion', l:'Descripción', t:'textarea' },
      { n:'precio', l:'Precio (COP)', t:'number', req:true },
      { n:'activo', l:'Activo', t:'select', opciones:[[1,'Sí'],[0,'No']], defecto:1 },
    ],
  },
  clientes: {
    titulo: 'Clientes', pk: 'id_cliente',
    cols: [['id_cliente','ID'], ['nombre','Nombre'], ['email','Correo (usuario)'], ['telefono','Teléfono'], ['ciudad','Ciudad']],
    campos: [
      { n:'id_usuario', l:'Usuario', t:'select', req:true, de:'usuarios', valor:'id_usuario', texto:r => `${r.nombre} — ${r.email}` },
      { n:'nombre', l:'Nombre', t:'text', req:true },
      { n:'telefono', l:'Teléfono', t:'text' },
      { n:'ciudad', l:'Ciudad', t:'text' },
    ],
  },
  resenas: {
    titulo: 'Reseñas', pk: 'id_resena',
    cols: [['id_resena','ID'], ['cliente','Cliente'], ['servicio','Servicio'],
           ['calificacion','Calificación', estrellas], ['comentario','Comentario'], ['fecha','Fecha', fecha]],
    campos: [
      { n:'id_cliente', l:'Cliente', t:'select', req:true, de:'clientes', valor:'id_cliente', texto:r => r.nombre },
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
  if (res.status === 401 && ruta !== '/login') { cerrarSesion(); throw new Error('Tu sesión venció, entra de nuevo'); }
  if (!res.ok) throw new Error(data.error || 'Error en el servidor');
  return data;
}

function toast(msg, tipo = '') {
  const t = $('toast');
  t.textContent = msg; t.className = `toast ${tipo} show`;
  setTimeout(() => t.classList.remove('show'), 3200);
}

/* ════════════════════════════════════════════
   SESIÓN
════════════════════════════════════════════ */
$('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  $('login-error').textContent = '';
  try {
    const d = await api('POST', '/login', { email: $('login-email').value.trim(), password: $('login-pass').value });
    token = d.token; sesion = d.usuario;
    sessionStorage.setItem('im_token', token);
    sessionStorage.setItem('im_usuario', JSON.stringify(sesion));
    $('login-pass').value = '';
    mostrarPanel();
  } catch (err) {
    $('login-error').textContent = err.message === 'Failed to fetch'
      ? 'No se pudo conectar con el servidor (¿está corriendo en el puerto 3000?)' : err.message;
  }
});

function cerrarSesion() {
  token = null; sesion = null;
  sessionStorage.removeItem('im_token'); sessionStorage.removeItem('im_usuario');
  $('vista-panel').style.display = 'none';
  $('vista-login').style.display = '';
}
$('btn-salir').addEventListener('click', cerrarSesion);

function mostrarPanel() {
  $('vista-login').style.display = 'none';
  $('vista-panel').style.display = '';
  $('admin-nombre').textContent = sesion?.nombre || '';
  $('admin-menu').innerHTML =
    `<button data-sec="resumen">📊 Resumen</button>` +
    Object.entries(ENT).map(([k, v]) => `<button data-sec="${k}">${v.titulo}</button>`).join('');
  abrirSeccion('resumen');
}

$('admin-menu').addEventListener('click', e => {
  const b = e.target.closest('button[data-sec]');
  if (b) abrirSeccion(b.dataset.sec);
});

/* ════════════════════════════════════════════
   SECCIONES
════════════════════════════════════════════ */
async function abrirSeccion(sec) {
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
    ['usuarios','Usuarios'], ['categorias','Categorías'], ['servicios','Servicios'],
    ['clientes','Clientes'], ['resenas','Reseñas'],
  ];
  $('seccion-resumen').innerHTML = `
    <h1>Resumen</h1>
    <div class="resumen-grid">
      ${items.map(([k, l]) => `<div class="resumen-card"><div class="resumen-n">${esc(r[k])}</div><div class="resumen-l">${l}</div></div>`).join('')}
      <div class="resumen-card"><div class="resumen-n">${r.promedio_calificacion ?? '—'}</div><div class="resumen-l">Calificación promedio</div></div>
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

$('tabla').addEventListener('click', e => {
  const ed = e.target.closest('[data-editar]');
  const bo = e.target.closest('[data-borrar]');
  if (ed) abrirFormulario(Number(ed.dataset.editar));
  if (bo) borrar(Number(bo.dataset.borrar));
});
$('btn-nuevo').addEventListener('click', () => abrirFormulario(null));

/* ════════════════════════════════════════════
   FORMULARIO (crear / editar)
════════════════════════════════════════════ */
async function opcionesDe(campo) {
  if (campo.opciones) return campo.opciones;
  const lista = await api('GET', '/' + campo.de);     // siempre datos frescos
  return lista.map(r => [r[campo.valor], campo.texto(r)]);
}

async function abrirFormulario(id) {
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
        input = `<select id="f-${c.n}" ${req}>
          ${c.de ? '<option value="">— Selecciona —</option>' : ''}
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
  const cfg = ENT[actual];
  const body = {};
  for (const c of cfg.campos) {
    const el = $('f-' + c.n);
    if (!el) continue;
    if (c.n === 'password' && editId && !el.value) continue;     // no cambiar contraseña
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
