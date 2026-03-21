import { Router } from 'express'
import { productController } from '../controllers/productController'
import { requireAuth } from '../middleware/authMiddleware'

export const productRoutes = Router()

productRoutes.use(requireAuth)
productRoutes.get('/', productController.list)
productRoutes.get('/:id', productController.get)
productRoutes.post('/', productController.create)
productRoutes.put('/:id', productController.update)
productRoutes.delete('/:id', productController.delete)
