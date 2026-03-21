import cors from 'cors'
import express from 'express'
import { env } from './config/env'
import { healthController } from './controllers/healthController'
import { authRoutes } from './routes/authRoutes'
import { assistantRoutes } from './routes/assistantRoutes'
import { categoryRoutes } from './routes/categoryRoutes'
import { dashboardRoutes } from './routes/dashboardRoutes'
import { invoiceRoutes } from './routes/invoiceRoutes'
import { productRoutes } from './routes/productRoutes'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)

  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))

  app.get('/', healthController.root)
  app.get('/healthz', healthController.ready)
  app.use('/api/auth', authRoutes)
  app.use('/api/assistant', assistantRoutes)
  app.use('/api/categories', categoryRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api', invoiceRoutes)

  return app
}
