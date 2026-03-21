import type { Request, Response } from 'express'
import { query } from '../db/postgres'

export const healthController = {
  root(_req: Request, res: Response) {
    res.send('Tax Assistant API is running!')
  },
  async ready(_req: Request, res: Response) {
    try {
      await query('SELECT 1')
      res.json({ status: 'ok', database: 'connected' })
    } catch (error) {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        message: error instanceof Error ? error.message : 'Database unavailable.',
      })
    }
  },
}
