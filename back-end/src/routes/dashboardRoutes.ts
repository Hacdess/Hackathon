import { Router } from 'express'
import { dashboardController } from '../controllers/dashboardController'
import { requireAuth } from '../middleware/authMiddleware'

export const dashboardRoutes = Router()

dashboardRoutes.use(requireAuth)
dashboardRoutes.get('/', dashboardController.get)
