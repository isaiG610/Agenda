// src/config/database.js
// ------------------------------------------------------------
// MySQL connection pool (mysql2/promise) configured from .env.
// Rubric: persistence. A pool reuses connections instead of
// opening a new one for every query.
// ------------------------------------------------------------

import 'dotenv/config'; // loads .env into process.env
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Returns true if MySQL answers, false otherwise (never throws).
export async function testConnection() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error(`MySQL error: ${error.message}`);
    return false;
  }
}

// [EVENT 06] Cleanup: closes every connection when the app shuts down.
export async function closePool() {
  try {
    await pool.end();
    console.log('Database pool closed.');
  } catch (error) {
    console.error(`Could not close the database pool: ${error.message}`);
  }
}
