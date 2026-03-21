import type { Product } from '../types/domain'
import { query } from '../db/postgres'

export const productRepository = {
  async findAll() {
    const result = await query<{
      id: string
      name: string
      sku: string
      description: string
      price: string
      stock: number
      category_id: string | null
      created_at: Date
      updated_at: Date
    }>(`
      SELECT id, name, sku, description, price, stock, category_id, created_at, updated_at
      FROM products
      ORDER BY created_at DESC
    `)

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      description: row.description,
      price: Number(row.price),
      stock: row.stock,
      categoryId: row.category_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }))
  },
  async findById(id: string) {
    const result = await query<{
      id: string
      name: string
      sku: string
      description: string
      price: string
      stock: number
      category_id: string | null
      created_at: Date
      updated_at: Date
    }>(
      `
        SELECT id, name, sku, description, price, stock, category_id, created_at, updated_at
        FROM products
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
          sku: row.sku,
          description: row.description,
          price: Number(row.price),
          stock: row.stock,
          categoryId: row.category_id,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        }
      : undefined
  },
  async findBySku(sku: string) {
    const result = await query<{
      id: string
      name: string
      sku: string
      description: string
      price: string
      stock: number
      category_id: string | null
      created_at: Date
      updated_at: Date
    }>(
      `
        SELECT id, name, sku, description, price, stock, category_id, created_at, updated_at
        FROM products
        WHERE LOWER(sku) = LOWER($1)
        LIMIT 1
      `,
      [sku],
    )

    const row = result.rows[0]
    return row
      ? {
          id: row.id,
          name: row.name,
          sku: row.sku,
          description: row.description,
          price: Number(row.price),
          stock: row.stock,
          categoryId: row.category_id,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        }
      : undefined
  },
  async create(product: Product) {
    await query(
      `
        INSERT INTO products (id, name, sku, description, price, stock, category_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        product.id,
        product.name,
        product.sku,
        product.description,
        product.price,
        product.stock,
        product.categoryId,
        product.createdAt,
        product.updatedAt,
      ],
    )

    return product
  },
  async update(
    id: string,
    updates: Partial<Pick<Product, 'name' | 'sku' | 'description' | 'price' | 'stock' | 'categoryId'>>,
  ) {
    const result = await query<{
      id: string
      name: string
      sku: string
      description: string
      price: string
      stock: number
      category_id: string | null
      created_at: Date
      updated_at: Date
    }>(
      `
        UPDATE products
        SET
          name = COALESCE($2, name),
          sku = COALESCE($3, sku),
          description = COALESCE($4, description),
          price = COALESCE($5, price),
          stock = COALESCE($6, stock),
          category_id = $7,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, sku, description, price, stock, category_id, created_at, updated_at
      `,
      [
        id,
        updates.name ?? null,
        updates.sku ?? null,
        updates.description ?? null,
        updates.price ?? null,
        updates.stock ?? null,
        updates.categoryId !== undefined ? updates.categoryId : null,
      ],
    )

    const row = result.rows[0]
    return row
      ? {
          id: row.id,
          name: row.name,
          sku: row.sku,
          description: row.description,
          price: Number(row.price),
          stock: row.stock,
          categoryId: row.category_id,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        }
      : null
  },
  async deleteById(id: string) {
    const result = await query<{
      id: string
    }>(
      `
        DELETE FROM products
        WHERE id = $1
        RETURNING id
      `,
      [id],
    )

    return result.rows[0] ?? null
  },
  async clearCategory(categoryId: string) {
    await query(
      `
        UPDATE products
        SET category_id = NULL, updated_at = NOW()
        WHERE category_id = $1
      `,
      [categoryId],
    )
  },
}
