import crypto from 'crypto'
import { categoryRepository } from '../repositories/categoryRepository'
import { productRepository } from '../repositories/productRepository'
import type { ProductWithCategory } from '../types/domain'

export const productService = {
  async listProducts(): Promise<ProductWithCategory[]> {
    const products = await productRepository.findAll()
    return Promise.all(products.map(async (product) => ({
      ...product,
      category: product.categoryId
        ? (await categoryRepository.findById(product.categoryId)) ?? null
        : null,
    })))
  },
  async getProduct(id: string) {
    const product = await productRepository.findById(id)
    if (!product) {
      throw new Error('Product not found.')
    }

    return product
  },
  async createProduct(input: {
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
  async updateProduct(
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
    const product = await productRepository.findById(id)
    if (!product) {
      throw new Error('Product not found.')
    }

    return productRepository.update(id, {
      name: input.name,
      sku: input.sku,
      description: input.description,
      price: input.price !== undefined ? Number(input.price) : undefined,
      stock: input.stock !== undefined ? Number(input.stock) : undefined,
      categoryId: input.categoryId !== undefined ? input.categoryId : product.categoryId,
    })
  },
  async deleteProduct(id: string) {
    const removedProduct = await productRepository.deleteById(id)
    if (!removedProduct) {
      throw new Error('Product not found.')
    }
  },
}
