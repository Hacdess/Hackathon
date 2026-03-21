import { products } from '../data/store'
import type { Product } from '../types/domain'

export const productRepository = {
  findAll() {
    return products
  },
  findById(id: string) {
    return products.find((product) => product.id === id)
  },
  create(product: Product) {
    products.unshift(product)
    return product
  },
  update(
    product: Product,
    updates: Partial<Pick<Product, 'name' | 'sku' | 'description' | 'price' | 'stock' | 'categoryId'>>,
  ) {
    product.name = updates.name ?? product.name
    product.sku = updates.sku ?? product.sku
    product.description = updates.description ?? product.description
    product.price = updates.price ?? product.price
    product.stock = updates.stock ?? product.stock
    product.categoryId = updates.categoryId !== undefined ? updates.categoryId : product.categoryId
    product.updatedAt = new Date().toISOString()
    return product
  },
  deleteById(id: string) {
    const index = products.findIndex((product) => product.id === id)
    if (index === -1) {
      return null
    }

    const [removedProduct] = products.splice(index, 1)
    return removedProduct
  },
  clearCategory(categoryId: string) {
    products.forEach((product) => {
      if (product.categoryId === categoryId) {
        product.categoryId = null
        product.updatedAt = new Date().toISOString()
      }
    })
  },
}
