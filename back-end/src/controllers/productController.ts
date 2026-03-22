import type { Request, Response } from 'express'
import { getRouteParam } from './helpers'
import { productService } from '../services/productService'

function statusCodeFor(message: string) {
  if (message === 'Product not found.') {
    return 404
  }

  if (message === 'Product name and SKU are required.') {
    return 400
  }

  if (message === 'A product with this SKU already exists.') {
    return 409
  }

  return 500
}

export const productController = {
  async list(_req: Request, res: Response) {
    res.json(await productService.listProducts())
  },
  async get(req: Request, res: Response) {
    try {
      res.json(await productService.getProduct(getRouteParam(req, 'id')))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load product.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
  async create(req: Request, res: Response) {
    try {
      const product = await productService.createProduct(req.body)
      res.status(201).json(product)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create product.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
  async update(req: Request, res: Response) {
    try {
      const product = await productService.updateProduct(getRouteParam(req, 'id'), req.body)
      res.json(product)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update product.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
  async delete(req: Request, res: Response) {
    try {
      await productService.deleteProduct(getRouteParam(req, 'id'))
      res.json({ message: 'Product deleted.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete product.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
}
