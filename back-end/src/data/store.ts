import crypto from 'crypto'
import type { Category, Product, SessionUser } from '../types/domain'

const now = () => new Date().toISOString()

export const users: SessionUser[] = [
  {
    id: crypto.randomUUID(),
    name: 'Demo Seller',
    email: 'seller@example.com',
    password: 'password123',
  },
]

export const categories: Category[] = [
  {
    id: crypto.randomUUID(),
    name: 'Electronics',
    description: 'Computers, phones, tablets, and related hardware.',
    createdAt: now(),
  },
  {
    id: crypto.randomUUID(),
    name: 'Accessories',
    description: 'Keyboards, mice, cables, and add-ons.',
    createdAt: now(),
  },
]

export const products: Product[] = [
  {
    id: crypto.randomUUID(),
    name: 'Keychron K8 Mechanical Keyboard',
    sku: 'KEY-K8-MXBR',
    description: 'Wireless mechanical keyboard with hot-swappable switches.',
    price: 99,
    stock: 142,
    categoryId: categories[1]?.id ?? null,
    createdAt: now(),
    updatedAt: now(),
  },
]

export const sessions = new Map<string, string>()
