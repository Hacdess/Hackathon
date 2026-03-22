import { isDatabaseConfigured } from '../config/env'
import { sessions } from '../data/store'
import { query } from '../db/postgres'

export const sessionRepository = {
  async getUserIdByToken(token: string) {
    if (!isDatabaseConfigured) {
      return sessions.get(token)
    }

    const result = await query<{ user_id: string }>(
      `
        SELECT user_id
        FROM sessions
        WHERE token = $1
        LIMIT 1
      `,
      [token],
    )

    return result.rows[0]?.user_id
  },
  async save(token: string, userId: string) {
    if (!isDatabaseConfigured) {
      sessions.set(token, userId)
      return
    }

    await query(
      `
        INSERT INTO sessions (token, user_id)
        VALUES ($1, $2)
      `,
      [token, userId],
    )
  },
  async delete(token: string) {
    if (!isDatabaseConfigured) {
      sessions.delete(token)
      return
    }

    await query(
      `
        DELETE FROM sessions
        WHERE token = $1
      `,
      [token],
    )
  },
}
