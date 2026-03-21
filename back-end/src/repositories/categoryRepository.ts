import { categories } from '../data/store'
import type { Category } from '../types/domain'

export const categoryRepository = {
  findAll() {
    return categories
  },
  findById(id: string) {
    return categories.find((category) => category.id === id)
  },
  create(category: Category) {
    categories.unshift(category)
    return category
  },
  update(category: Category, updates: Partial<Pick<Category, 'name' | 'description'>>) {
    category.name = updates.name ?? category.name
    category.description = updates.description ?? category.description
    return category
  },
  deleteById(id: string) {
    const index = categories.findIndex((category) => category.id === id)
    if (index === -1) {
      return null
    }

    const [removedCategory] = categories.splice(index, 1)
    return removedCategory
  },
}
