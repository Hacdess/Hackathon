import { Router } from 'express'
import { invoiceController } from '../controllers/invoiceController'

export const invoiceRoutes = Router()

invoiceRoutes.post('/process-invoice', invoiceController.process)
