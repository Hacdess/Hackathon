import type { Category } from '../types/domain'
import { isDatabaseConfigured } from '../config/env'
import { categories } from '../data/store'
import { query } from '../db/postgres'

export const categoryRepository = {
  async findAll() {
    if (!isDatabaseConfigured) {
      return [...categories].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    }

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
    if (!isDatabaseConfigured) {
      return categories.find((category) => category.id === id)
    }

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
  async findByName(name: string) {
    if (!isDatabaseConfigured) {
      return categories.find((category) => category.name.toLowerCase() === name.toLowerCase())
    }

    const result = await query<{
      id: string
      name: string
      description: string
      created_at: Date
    }>(
      `
        SELECT id, name, description, created_at
        FROM categories
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
      `,
      [name],
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
    if (!isDatabaseConfigured) {
      categories.unshift(category)
      return category
    }

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
    if (!isDatabaseConfigured) {
      const existingCategory = categories.find((category) => category.id === id)
      if (!existingCategory) {
        return null
      }

      if (updates.name !== undefined) {
        existingCategory.name = updates.name
      }

      if (updates.description !== undefined) {
        existingCategory.description = updates.description
      }

      return existingCategory
    }

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
    if (!isDatabaseConfigured) {
      const index = categories.findIndex((category) => category.id === id)
      if (index === -1) {
        return null
      }

      const [removedCategory] = categories.splice(index, 1)
      return removedCategory ?? null
    }

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
