import type { QueryResultRow } from 'pg'
import { Pool } from 'pg'
import { env, isDatabaseConfigured } from '../config/env'

export const pool = isDatabaseConfigured
  ? new Pool({
      connectionString: env.databaseUrl,
      ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  if (!pool) {
    throw new Error('Database is not configured.')
  }

  return pool.query<T>(text, params)
}

export async function closePool() {
  if (pool) {
    await pool.end()
  }
}
