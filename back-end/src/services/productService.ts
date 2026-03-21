import crypto from 'crypto'
import { categoryRepository } from '../repositories/categoryRepository'
import { productRepository } from '../repositories/productRepository'
import type { ProductWithCategory } from '../types/domain'

export const productService = {
  listProducts(): ProductWithCategory[] {
    return productRepository.findAll().map((product) => ({
      ...product,
      category: product.categoryId
        ? categoryRepository.findById(product.categoryId) ?? null
        : null,
    }))
  },
  getProduct(id: string) {
    const product = productRepository.findById(id)
    if (!product) {
      throw new Error('Product not found.')
    }

    return product
  },
  createProduct(input: {
    name?: string
    sku?: string
    description?: string
    price?: number
    stock?: number
    categoryId?: string | null
  }) {
    if (!input.name || !input.sku) {
      throw new Error('Product name and SKU are required.')
    }

    return productRepository.create({
      id: crypto.randomUUID(),
      name: input.name,
      sku: input.sku,
      description: input.description ?? '',
      price: Number(input.price ?? 0),
      stock: Number(input.stock ?? 0),
      categoryId: input.categoryId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  },
  updateProduct(
    id: string,
    input: {
      name?: string
      sku?: string
      description?: string
      price?: number
      stock?: number
      categoryId?: string | null
    },
  ) {
    const product = productRepository.findById(id)
    if (!product) {
      throw new Error('Product not found.')
    }

    return productRepository.update(product, {
      name: input.name,
      sku: input.sku,
      description: input.description,
      price: input.price !== undefined ? Number(input.price) : undefined,
      stock: input.stock !== undefined ? Number(input.stock) : undefined,
      categoryId: input.categoryId,
    })
  },
  deleteProduct(id: string) {
    const removedProduct = productRepository.deleteById(id)
    if (!removedProduct) {
      throw new Error('Product not found.')
    }
  },
}
