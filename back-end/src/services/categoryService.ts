import crypto from 'crypto'
import { categoryRepository } from '../repositories/categoryRepository'
import { productRepository } from '../repositories/productRepository'

export const categoryService = {
  async listCategories() {
    return categoryRepository.findAll()
  },
  async createCategory(input: { name?: string; description?: string }) {
    if (!input.name) {
      throw new Error('Category name is required.')
    }

    return categoryRepository.create({
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description ?? '',
      createdAt: new Date().toISOString(),
    })
  },
  async updateCategory(id: string, input: { name?: string; description?: string }) {
    const category = await categoryRepository.findById(id)
    if (!category) {
      throw new Error('Category not found.')
    }

    return categoryRepository.update(id, input)
  },
  async deleteCategory(id: string) {
    const removedCategory = await categoryRepository.deleteById(id)
    if (!removedCategory) {
      throw new Error('Category not found.')
    }

    await productRepository.clearCategory(removedCategory.id)
  },
}
