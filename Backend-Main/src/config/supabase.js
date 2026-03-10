import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in environment variables');
}

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Execute a query against the pool.
 * Returns { rows, rowCount } matching the pg API.
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client for transactions.
 * Caller is responsible for client.release().
 */
export const getClient = () => pool.connect();

/**
 * Compatibility shim so existing controllers that imported `supabase`
 * still work — they call supabase.from(...).select(...) etc.
 * We replace those call-chains with raw SQL one file at a time.
 * This shim is intentionally minimal — it throws clear errors
 * if any forgotten Supabase chain is called.
 */
export const supabase = {
  from: () => { throw new Error('supabase.from() called — migrate this file to use db.query()'); },
};

export default pool;
