import type { QueryResultRow } from 'pg'
import { Pool } from 'pg'
import { env } from '../config/env'

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required to connect the backend to PostgreSQL.')
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
})

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params)
}
