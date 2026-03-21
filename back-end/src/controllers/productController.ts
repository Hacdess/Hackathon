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

  return 500
}

export const productController = {
  list(_req: Request, res: Response) {
    res.json(productService.listProducts())
  },
  get(req: Request, res: Response) {
    try {
      res.json(productService.getProduct(getRouteParam(req, 'id')))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load product.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
  create(req: Request, res: Response) {
    try {
      const product = productService.createProduct(req.body)
      res.status(201).json(product)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create product.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
  update(req: Request, res: Response) {
    try {
      const product = productService.updateProduct(getRouteParam(req, 'id'), req.body)
      res.json(product)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update product.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
  delete(req: Request, res: Response) {
    try {
      productService.deleteProduct(getRouteParam(req, 'id'))
      res.json({ message: 'Product deleted.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete product.'
      res.status(statusCodeFor(message)).json({ message })
    }
  },
}
