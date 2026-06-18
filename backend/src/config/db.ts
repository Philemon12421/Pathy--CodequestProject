import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
pool.on('error', (err: Error) => console.error('❌ DB error:', err));

export default pool;
