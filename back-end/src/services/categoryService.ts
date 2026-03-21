import crypto from 'crypto'
import { categoryRepository } from '../repositories/categoryRepository'
import { productRepository } from '../repositories/productRepository'

export const categoryService = {
  listCategories() {
    return categoryRepository.findAll()
  },
  createCategory(input: { name?: string; description?: string }) {
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
  updateCategory(id: string, input: { name?: string; description?: string }) {
    const category = categoryRepository.findById(id)
    if (!category) {
      throw new Error('Category not found.')
    }

    return categoryRepository.update(category, input)
  },
  deleteCategory(id: string) {
    const removedCategory = categoryRepository.deleteById(id)
    if (!removedCategory) {
      throw new Error('Category not found.')
    }

    productRepository.clearCategory(removedCategory.id)
  },
}
