import crypto from 'crypto'
import { query } from './postgres'

function hashSeedPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${derivedKey}`
}

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  const demoUserEmail = 'seller@example.com'
  const existingUser = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [
    demoUserEmail,
  ])

  if (existingUser.rowCount === 0) {
    const electronicsId = crypto.randomUUID()
    const accessoriesId = crypto.randomUUID()

    await query(
      `
        INSERT INTO users (id, name, email, password)
        VALUES ($1, $2, $3, $4);
      `,
      [crypto.randomUUID(), 'Demo Seller', demoUserEmail, hashSeedPassword('password123')],
    )

    await query(
      `
        INSERT INTO categories (id, name, description)
        VALUES
          ($1, $2, $3),
          ($4, $5, $6);
      `,
      [
        electronicsId,
        'Electronics',
        'Computers, phones, tablets, and related hardware.',
        accessoriesId,
        'Accessories',
        'Keyboards, mice, cables, and add-ons.',
      ],
    )

    await query(
      `
        INSERT INTO products (id, name, sku, description, price, stock, category_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `,
      [
        crypto.randomUUID(),
        'Keychron K8 Mechanical Keyboard',
        'KEY-K8-MXBR',
        'Wireless mechanical keyboard with hot-swappable switches.',
        99,
        142,
        accessoriesId,
      ],
    )
  }
}
