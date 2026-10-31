/* ImpulsaMarket — sección Clientes: reseñas reales desde la base de datos */
(function () {
  const grid = document.getElementById('resenas-grid');
  if (!grid) return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  fetch('http://localhost:3000/api/publico/resenas')
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(lista => {
      if (!lista.length) { grid.innerHTML = '<p class="resenas-msg">Aún no hay reseñas publicadas.</p>'; return; }
      grid.innerHTML = lista.map(r => `
        <div class="resena">
          <div class="resena-estrellas">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</div>
          <p class="resena-texto">${r.comentario ? '“' + esc(r.comentario) + '”' : 'Cliente satisfecho'}</p>
          <div class="resena-autor">${esc(r.cliente)}</div>
          <div class="resena-meta">${esc(r.servicio)}${r.ciudad ? ' · ' + esc(r.ciudad) : ''}</div>
        </div>`).join('');
    })
    .catch(() => { grid.innerHTML = '<p class="resenas-msg">No se pudieron cargar las reseñas (revisa que el servidor y la base impulsamarket_v2 estén activos).</p>'; });
})();
