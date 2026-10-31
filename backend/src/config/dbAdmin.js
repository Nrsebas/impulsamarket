const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

/* Conexión a la base de datos NUEVA (impulsamarket_v2).
   La base original (impulsamarket) sigue funcionando con config/db.js */
const poolV2 = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME_V2  || 'impulsamarket_v2',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

module.exports = poolV2;
