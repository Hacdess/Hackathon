import { Router } from 'express'
import { categoryController } from '../controllers/categoryController'
import { requireAuth } from '../middleware/authMiddleware'

export const categoryRoutes = Router()

categoryRoutes.use(requireAuth)
categoryRoutes.get('/', categoryController.list)
categoryRoutes.post('/', categoryController.create)
categoryRoutes.put('/:id', categoryController.update)
categoryRoutes.delete('/:id', categoryController.delete)
