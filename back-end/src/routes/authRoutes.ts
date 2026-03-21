import { Router } from 'express'
import { authController } from '../controllers/authController'
import { requireAuth } from '../middleware/authMiddleware'

export const authRoutes = Router()

authRoutes.get('/me', requireAuth, authController.me)
authRoutes.post('/register', authController.register)
authRoutes.post('/login', authController.login)
authRoutes.post('/logout', authController.logout)
