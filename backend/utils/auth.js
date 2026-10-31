const crypto = require('crypto');

/* ─────────────────────────────────────────────
   Utilidades de autenticación (sin librerías extra)
   - Contraseñas: scrypt con sal  → "sal:hash"
   - Sesión: token firmado con HMAC (expira en 8 horas)
───────────────────────────────────────────── */
const SECRET = process.env.AUTH_SECRET || 'impulsamarket-cambia-este-secreto';
const DURACION_MS = 8 * 60 * 60 * 1000;

function hashPassword(password) {
    const sal = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, sal, 64).toString('hex');
    return `${sal}:${hash}`;
}

function verificarPassword(password, guardado) {
    const [sal, hash] = String(guardado || '').split(':');
    if (!sal || !hash) return false;
    const calculado = crypto.scryptSync(password, sal, 64);
    const original = Buffer.from(hash, 'hex');
    return original.length === calculado.length && crypto.timingSafeEqual(original, calculado);
}

function firmar(data) {
    return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

function crearToken(usuario) {
    const payload = Buffer.from(JSON.stringify({
        id: usuario.id_usuario, rol: usuario.rol, exp: Date.now() + DURACION_MS,
    })).toString('base64url');
    return `${payload}.${firmar(payload)}`;
}

function leerToken(token) {
    const [payload, firma] = String(token || '').split('.');
    if (!payload || !firma) return null;
    const esperada = firmar(payload);
    if (firma.length !== esperada.length ||
        !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
    try {
        const datos = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return datos.exp > Date.now() ? datos : null;
    } catch { return null; }
}

module.exports = { hashPassword, verificarPassword, crearToken, leerToken };