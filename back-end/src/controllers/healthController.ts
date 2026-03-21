import type { Request, Response } from 'express'

export const healthController = {
  root(_req: Request, res: Response) {
    res.send('Tax Assistant API is running!')
  },
}
