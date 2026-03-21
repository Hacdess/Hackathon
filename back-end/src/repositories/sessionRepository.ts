import { query } from '../db/postgres'

export const sessionRepository = {
  async getUserIdByToken(token: string) {
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
    await query(
      `
        INSERT INTO sessions (token, user_id)
        VALUES ($1, $2)
      `,
      [token, userId],
    )
  },
  async delete(token: string) {
    await query(
      `
        DELETE FROM sessions
        WHERE token = $1
      `,
      [token],
    )
  },
}
