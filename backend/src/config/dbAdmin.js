/* Reutiliza el pool de conexión unificado de la base de datos `impulsamarket`.
   Se conserva este archivo para mantener intacta la estructura del proyecto. */
const pool = require('./db');

module.exports = pool;
