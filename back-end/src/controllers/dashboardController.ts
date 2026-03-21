import type { Request, Response } from 'express'
import { dashboardService } from '../services/dashboardService'

export const dashboardController = {
  async get(_req: Request, res: Response) {
    try {
      const dashboard = await dashboardService.getDashboard()
      res.json(dashboard)
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Unable to load dashboard data.',
      })
    }
  },
}
