import type { Request, Response } from 'express'
import { getRouteParam } from './helpers'
import { categoryService } from '../services/categoryService'

function statusCodeFor(message: string) {
  if (message === 'Category not found.') {
    return 404
  }

  if (message === 'Category name is required.') {
    return 400
  }

  return 500
}

export const categoryController = {
  async list(_req: Request, res: Response) {
    res.json(await categoryService.listCategories())
  },
  async create(req: Request, res: Response) {
    try {
      const category = await categoryService.createCategory(req.body)
      res.status(201).json(category)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create category.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
  async update(req: Request, res: Response) {
    try {
      const category = await categoryService.updateCategory(getRouteParam(req, 'id'), req.body)
      res.json(category)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update category.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
  async delete(req: Request, res: Response) {
    try {
      await categoryService.deleteCategory(getRouteParam(req, 'id'))
      res.json({ message: 'Category deleted.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete category.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
}
