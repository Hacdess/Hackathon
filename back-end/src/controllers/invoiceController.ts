import type { Request, Response } from 'express'
import type { ApiResponse } from '../types/domain'
import { invoiceService } from '../services/invoiceService'

export const invoiceController = {
  async process(req: Request, res: Response<ApiResponse>) {
    try {
      const result = await invoiceService.processInvoice(req.body?.spokenText)
      res.json(result)
    } catch (error) {
      console.error('Server error:', error)
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong, please try again.',
      })
    }
  },
}
