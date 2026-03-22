import type { SessionUser } from '../types/domain'
import { query } from '../db/postgres'

export const authRepository = {
  async findByEmail(email: string) {
    const result = await query<{
      id: string
      name: string
      email: string
      password: string
    }>(
      `
        SELECT id, name, email, password
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email],
    )

    return result.rows[0]
  },
  async findById(id: string) {
    const result = await query<{
      id: string
      name: string
      email: string
      password: string
    }>(
      `
        SELECT id, name, email, password
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    )

    return result.rows[0]
  },
  async create(user: SessionUser) {
    await query(
      `
        INSERT INTO users (id, name, email, password)
        VALUES ($1, $2, $3, $4)
      `,
      [user.id, user.name, user.email, user.password],
    )

    return user
  },
  async updatePassword(id: string, password: string) {
    await query(
      `
        UPDATE users
        SET password = $2
        WHERE id = $1
      `,
      [id, password],
    )
  },
}
