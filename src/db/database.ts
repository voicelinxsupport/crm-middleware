import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      secret TEXT NOT NULL,
      name TEXT,
      active INTEGER DEFAULT 0,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
    CREATE TABLE IF NOT EXISTS user_tokens (
      client_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      instance_url TEXT NOT NULL,
      email TEXT,
      expires_at BIGINT,
      updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      PRIMARY KEY (client_id, user_id)
    );
  `);
}

export interface UserToken {
  client_id: string;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  email?: string;
  expires_at?: number;
}

export async function getClient(clientId: string) {
  const r = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
  return r.rows[0] as { id: string; secret: string; name: string; active: number } | undefined;
}

export async function createClient(id: string, secret: string, name: string) {
  await pool.query('INSERT INTO clients (id, secret, name) VALUES ($1, $2, $3)', [id, secret, name]);
}

export async function activateClient(clientId: string) {
  await pool.query('UPDATE clients SET active = 1 WHERE id = $1', [clientId]);
}

export async function isClientActive(clientId: string): Promise<boolean> {
  const r = await pool.query('SELECT active FROM clients WHERE id = $1', [clientId]);
  return r.rows[0]?.active === 1;
}

export async function listClients() {
  const r = await pool.query('SELECT id, name, active, created_at FROM clients ORDER BY created_at DESC');
  return r.rows;
}

export async function saveUserToken(token: UserToken) {
  const now = Math.floor(Date.now() / 1000);
  await pool.query(`
    INSERT INTO user_tokens (client_id, user_id, access_token, refresh_token, instance_url, email, expires_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (client_id, user_id) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      instance_url = EXCLUDED.instance_url,
      email = EXCLUDED.email,
      expires_at = EXCLUDED.expires_at,
      updated_at = EXCLUDED.updated_at
  `, [token.client_id, token.user_id, token.access_token, token.refresh_token ?? null,
      token.instance_url, token.email ?? null, token.expires_at ?? null, now]);
}

export async function getUserToken(clientId: string, userId: string): Promise<UserToken | undefined> {
  const r = await pool.query(
    'SELECT * FROM user_tokens WHERE client_id = $1 AND user_id = $2',
    [clientId, userId]
  );
  return r.rows[0] as UserToken | undefined;
}

export async function deleteUserToken(clientId: string, userId: string) {
  await pool.query('DELETE FROM user_tokens WHERE client_id = $1 AND user_id = $2', [clientId, userId]);
}
