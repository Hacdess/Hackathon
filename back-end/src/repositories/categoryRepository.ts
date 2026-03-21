import type { Category } from '../types/domain'
import { query } from '../db/postgres'

export const categoryRepository = {
  async findAll() {
    const result = await query<{
      id: string
      name: string
      description: string
      created_at: Date
    }>(`
      SELECT id, name, description, created_at
      FROM categories
      ORDER BY created_at DESC
    `)

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at.toISOString(),
    }))
  },
  async findById(id: string) {
    const result = await query<{
      id: string
      name: string
      description: string
      created_at: Date
    }>(
      `
        SELECT id, name, description, created_at
        FROM categories
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    )

    const row = result.rows[0]
    return row
      ? {
          id: row.id,
          name: row.name,
          description: row.description,
          createdAt: row.created_at.toISOString(),
        }
      : undefined
  },
  async create(category: Category) {
    await query(
      `
        INSERT INTO categories (id, name, description, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [category.id, category.name, category.description, category.createdAt],
    )

    return category
  },
  async update(id: string, updates: Partial<Pick<Category, 'name' | 'description'>>) {
    const result = await query<{
      id: string
      name: string
      description: string
      created_at: Date
    }>(
      `
        UPDATE categories
        SET
          name = COALESCE($2, name),
          description = COALESCE($3, description)
        WHERE id = $1
        RETURNING id, name, description, created_at
      `,
      [id, updates.name ?? null, updates.description ?? null],
    )

    const row = result.rows[0]
    return row
      ? {
          id: row.id,
          name: row.name,
          description: row.description,
          createdAt: row.created_at.toISOString(),
        }
      : null
  },
  async deleteById(id: string) {
    const result = await query<{
      id: string
      name: string
      description: string
      created_at: Date
    }>(
      `
        DELETE FROM categories
        WHERE id = $1
        RETURNING id, name, description, created_at
      `,
      [id],
    )

    const row = result.rows[0]
    return row
      ? {
          id: row.id,
          name: row.name,
          description: row.description,
          createdAt: row.created_at.toISOString(),
        }
      : null
  },
}
