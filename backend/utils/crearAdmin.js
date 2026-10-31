/* ─────────────────────────────────────────────
   Crea o actualiza un usuario ADMINISTRADOR con la
   contraseña bien cifrada.

   Uso (desde la carpeta backend):
     node utils/crearAdmin.js correo@ejemplo.com MiClave123 "Mi Nombre"
───────────────────────────────────────────── */
const pool = require('../src/config/db');
const { hashPassword } = require('../src/utils/auth');

(async () => {
  const [email, password, nombre = 'Administrador'] = process.argv.slice(2);
  if (!email || !password) {
    console.log('Uso: node utils/crearAdmin.js <correo> <contraseña> ["Nombre"]');
    process.exit(1);
  }
  if (password.length < 6) {
    console.log('❌ La contraseña debe tener al menos 6 caracteres');
    process.exit(1);
  }
  try {
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
       VALUES (?, ?, ?, 'admin', 1)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), password_hash = VALUES(password_hash), rol = 'admin', activo = 1`,
      [nombre, email.trim(), hashPassword(password)]
    );
    console.log(`✅ Listo. Ya puedes entrar al panel con: ${email.trim()}`);
  } catch (err) {
    console.error('❌ No se pudo guardar:', err.message);
    process.exit(1);
  }
  process.exit(0);
})();
