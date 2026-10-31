/* ═══════════════════════════════════════════════
   ImpulsaMarket — app.js
   Cliente frontend → API Node.js → MySQL
   ═══════════════════════════════════════════════ */

const API = 'http://localhost:3000/api';

/* ── Scroll Progress ── */
window.addEventListener('scroll', () => {
  const sp = document.getElementById('sp');
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  sp.style.width = pct + '%';
});

/* ── Escapar texto antes de insertarlo como HTML (evita XSS) ── */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ── Los campos ocultos no pueden ser obligatorios (bloqueaban el envío al editar) ── */
function marcarObligatorios(activo) {
  ['cliente-nombre','cliente-email','servicio-id'].forEach(id => {
    document.getElementById(id).required = activo;
  });
}

/* ── Estado global ── */
let servicios = [];
let pedidos   = [];

/* ════════════════════════════════════════════
   INICIALIZACIÓN Y SESIÓN EN NAVBAR
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  actualizarNavSesion();
  await cargarServicios();
  await cargarPedidos();
  initFormPedido();
  animarContadores();
});

function obtenerSesionActual() {
  try {
    return JSON.parse(localStorage.getItem('im_usuario') || sessionStorage.getItem('im_usuario') || 'null');
  } catch { return null; }
}

function obtenerTokenActual() {
  return localStorage.getItem('im_token') || sessionStorage.getItem('im_token') || null;
}

function esAdminActual() {
  const usr = obtenerSesionActual();
  return Boolean(obtenerTokenActual() && usr && usr.rol === 'admin');
}

function actualizarNavSesion() {
  const nav     = document.getElementById('nav-acciones');
  const fabWrap = document.getElementById('fab-admin-wrap');
  const panel   = document.getElementById('panel-admin');
  const usr     = obtenerSesionActual();
  const esAdmin = esAdminActual();

  // Mostrar el botón flotante "Panel Admin" ÚNICAMENTE si inició sesión como administrador
  if (fabWrap) fabWrap.style.display = esAdmin ? '' : 'none';
  if (!esAdmin && panel) panel.classList.remove('open');

  if (!nav) return;
  if (usr && usr.nombre) {
    const etq = esAdmin ? 'Panel Admin' : 'Mi Cuenta';
    nav.innerHTML = `
      <a class="nav-login" href="admin.html">👤 ${esc(usr.nombre)} · ${etq}</a>
      <button class="nav-login" onclick="cerrarSesionSitio()" style="cursor:pointer;background:none;">Salir</button>
      <button class="nav-cta" onclick="abrirModalCotizacion()">Cotizar Ahora</button>
    `;
  } else {
    nav.innerHTML = `
      <a class="nav-login" href="admin.html">Iniciar sesión</a>
      <a class="nav-login" href="admin.html#registro">Registrarse</a>
      <button class="nav-cta" onclick="abrirModalCotizacion()">Cotizar Ahora</button>
    `;
  }
}

function cerrarSesionSitio() {
  localStorage.removeItem('im_token');
  localStorage.removeItem('im_usuario');
  sessionStorage.removeItem('im_token');
  sessionStorage.removeItem('im_usuario');
  actualizarNavSesion();
  mostrarToast('👋 Has cerrado sesión', 'success');
}

/* ════════════════════════════════════════════
   SERVICIOS  (GET /api/servicios)
════════════════════════════════════════════ */
async function cargarServicios() {
  const grid   = document.getElementById('svc-grid');
  const select = document.getElementById('servicio-id');

  // Skeleton loaders
  grid.innerHTML = Array(4).fill(`
    <div class="svc-card skeleton svc-card-skeleton"></div>`).join('');

  try {
    const res  = await fetch(`${API}/servicios`);
    servicios  = await res.json();

    // Renderizar tarjetas
    grid.innerHTML = servicios.map(s => `
      <div class="svc-card fade-in">
        <div class="svc-icon">${iconoServicio(s.nombre)}</div>
        <div class="svc-name">${esc(s.nombre)}</div>
        <div class="svc-desc">${esc(s.descripcion)}</div>
        <div class="svc-price">$${Number(s.precio_base).toLocaleString('es-CO')}<span> COP</span></div>
      </div>`).join('');

    // Llenar select del modal
    select.innerHTML = `<option value="">— Selecciona un servicio —</option>` +
      servicios.map(s => `<option value="${s.id_servicio}">${esc(s.nombre)} — $${Number(s.precio_base).toLocaleString('es-CO')}</option>`).join('');

  } catch {
    grid.innerHTML   = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>No se pudieron cargar los servicios.</p></div>`;
    select.innerHTML = `<option value="">Error al cargar</option>`;
  }
}

/* ════════════════════════════════════════════
   PEDIDOS  (GET /api/pedidos)
════════════════════════════════════════════ */
async function cargarPedidos() {
  try {
    const res = await fetch(`${API}/pedidos`);
    pedidos   = await res.json();
    renderPedidos();
    actualizarEstadisticas();
  } catch {
    document.getElementById('lista-pedidos-admin').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><p>No se pudo conectar con el servidor.</p></div>`;
  }
}

function renderPedidos() {
  const lista = document.getElementById('lista-pedidos-admin');
  if (!pedidos.length) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No hay pedidos registrados.</p></div>`;
    return;
  }
  lista.innerHTML = pedidos.map(p => `
    <div class="pedido-card" id="pedido-${p.id_pedido}">
      <div class="pedido-card-head">
        <span class="pedido-card-name">${esc(p.nombre_cliente)}</span>
        <span class="pedido-card-id">#${p.id_pedido}</span>
      </div>
      <div class="pedido-card-svc">🎨 ${esc(p.nombre_servicio || p.id_servicio)}${p.nombre_empleado ? ' · 👤 ' + esc(p.nombre_empleado) : ''}</div>
      <div class="pedido-card-detail">${esc(p.detalles || 'Sin detalles')}</div>
      <div class="pedido-card-footer">
        <span class="status-badge ${p.estado}">${etiquetaEstado(p.estado)}</span>
        <div class="pedido-card-actions">
          <button class="btn-edit"   onclick="abrirModalEditar(${p.id_pedido})">✏️ Editar</button>
          <button class="btn-delete" onclick="eliminarPedido(${p.id_pedido})">🗑️ Borrar</button>
        </div>
      </div>
    </div>`).join('');
}

function actualizarEstadisticas() {
  const total      = pedidos.length;
  const enProceso  = pedidos.filter(p => p.estado === 'en_proceso').length;
  const entregados = pedidos.filter(p => p.estado === 'entregado').length;
  const cancelados = pedidos.filter(p => p.estado === 'cancelado').length;

  animarNum('stat-pedidos',   total);
  animarNum('stat-proceso',   enProceso);
  animarNum('stat-entregados',entregados);
  animarNum('stat-cancelados',cancelados);

  document.getElementById('stat-panel-proceso').textContent   = enProceso;
  document.getElementById('stat-panel-entregado').textContent = entregados;
  document.getElementById('stat-panel-cancelado').textContent = cancelados;
  document.getElementById('admin-badge').textContent          = total;
}

/* ════════════════════════════════════════════
   FORMULARIO — CREAR / EDITAR
════════════════════════════════════════════ */
function initFormPedido() {
  document.getElementById('form-pedido').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('pedido-id').value;
    id ? await actualizarPedido(id) : await crearPedido();
  });
}

async function crearPedido() {
  const body = {
    nombre_cliente:   document.getElementById('cliente-nombre').value.trim(),
    email_cliente:    document.getElementById('cliente-email').value.trim(),
    telefono_cliente: document.getElementById('cliente-telefono').value.trim(),
    id_servicio:      document.getElementById('servicio-id').value,
    detalles:         document.getElementById('pedido-detalles').value.trim(),
  };
  try {
    const res = await fetch(`${API}/pedidos`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error();
    cerrarModal();
    mostrarToast('✅ Pedido registrado con éxito', 'success');
    await cargarPedidos();
  } catch {
    mostrarToast('❌ Error al guardar el pedido', 'error');
  }
}

async function actualizarPedido(id) {
  const token = obtenerTokenActual();
  const body = {
    estado:   document.getElementById('pedido-estado').value,
    detalles: document.getElementById('pedido-detalles').value.trim(),
  };
  try {
    const res = await fetch(`${API}/pedidos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
    cerrarModal();
    mostrarToast('✅ Pedido actualizado', 'success');
    await cargarPedidos();
  } catch {
    mostrarToast('❌ Error al actualizar', 'error');
  }
}

/* ════════════════════════════════════════════
   ELIMINAR
════════════════════════════════════════════ */
async function eliminarPedido(id) {
  if (!confirm('¿Eliminar este pedido permanentemente?')) return;
  const token = obtenerTokenActual();
  try {
    const res = await fetch(`${API}/pedidos/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
    if (!res.ok) throw new Error();
    mostrarToast('🗑️ Pedido eliminado', 'success');
    await cargarPedidos();
  } catch {
    mostrarToast('❌ Error al eliminar', 'error');
  }
}

/* ════════════════════════════════════════════
   MODAL
════════════════════════════════════════════ */
function abrirModalCotizacion() {
  limpiarModal();
  marcarObligatorios(true);
  const usr = obtenerSesionActual();
  if (usr) {
    document.getElementById('cliente-nombre').value   = usr.nombre   || '';
    document.getElementById('cliente-email').value    = usr.email    || '';
    document.getElementById('cliente-telefono').value = usr.telefono || '';
  }
  document.getElementById('modal-title').textContent = 'Solicitar Cotización';
  document.getElementById('grupo-cliente-nombre').style.display   = '';
  document.getElementById('grupo-cliente-contacto').style.display = '';
  document.getElementById('grupo-servicio-select').style.display  = '';
  document.getElementById('grupo-estado-edit').style.display      = 'none';
  document.getElementById('modal-overlay').classList.add('active');
}

function abrirModalEditar(id) {
  const p = pedidos.find(x => x.id_pedido === id);
  if (!p) return;
  limpiarModal();
  marcarObligatorios(false);
  document.getElementById('modal-title').textContent              = 'Editar Pedido #' + id;
  document.getElementById('pedido-id').value                      = id;
  document.getElementById('pedido-detalles').value                = p.detalles || '';
  document.getElementById('pedido-estado').value                  = p.estado;
  document.getElementById('grupo-cliente-nombre').style.display   = 'none';
  document.getElementById('grupo-cliente-contacto').style.display = 'none';
  document.getElementById('grupo-servicio-select').style.display  = 'none';
  document.getElementById('grupo-estado-edit').style.display      = '';
  document.getElementById('modal-overlay').classList.add('active');
}

function cerrarModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

function limpiarModal() {
  document.getElementById('pedido-id').value           = '';
  document.getElementById('cliente-nombre').value      = '';
  document.getElementById('cliente-email').value       = '';
  document.getElementById('cliente-telefono').value    = '';
  document.getElementById('servicio-id').value         = '';
  document.getElementById('pedido-detalles').value     = '';
  document.getElementById('pedido-estado').value       = 'en_proceso';
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', e => {
  const overlay = document.getElementById('modal-overlay');
  if (e.target === overlay) cerrarModal();
});

/* ════════════════════════════════════════════
   PANEL ADMIN
════════════════════════════════════════════ */
function toggleAdminPanel() {
  if (!esAdminActual()) return;
  document.getElementById('panel-admin').classList.toggle('open');
}

/* ════════════════════════════════════════════
   UTILIDADES
════════════════════════════════════════════ */
function mostrarToast(msg, tipo = '') {
  const t = document.getElementById('toast');
  t.textContent  = msg;
  t.className    = `toast ${tipo} show`;
  setTimeout(() => t.classList.remove('show'), 3200);
}

function etiquetaEstado(est) {
  const map = { en_proceso:'⏳ En Proceso', entregado:'✅ Entregado', cancelado:'❌ Cancelado' };
  return map[est] || est;
}

function iconoServicio(nombre = '') {
  const n = nombre.toLowerCase();
  if (n.includes('logo'))    return '✦';
  if (n.includes('redes'))   return '📱';
  if (n.includes('cartel') || n.includes('impr')) return '🖨️';
  if (n.includes('brand'))   return '💎';
  if (n.includes('web'))     return '🌐';
  return '🎨';
}

function animarNum(id, target, dur = 900) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff  = target - start;
  const t0    = performance.now();
  const step  = ts => {
    const pct = Math.min((ts - t0) / dur, 1);
    el.textContent = Math.round(start + diff * ease(pct));
    if (pct < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function ease(t) { return t < .5 ? 2*t*t : -1+(4-2*t)*t; }

function animarContadores() {
  // Los contadores se activan cuando el hero es visible
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) actualizarEstadisticas(); });
  }, { threshold: .3 });
  const hero = document.getElementById('hero');
  if (hero) obs.observe(hero);
}
