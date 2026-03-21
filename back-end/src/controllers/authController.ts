import type { Request, Response } from 'express'
import { env } from '../config/env'
import { authService } from '../services/authService'
import { clearSessionCookie, setSessionCookie } from '../middleware/authMiddleware'
import { parseCookies } from '../middleware/cookie'
import type { AuthenticatedRequest } from '../middleware/authMiddleware'

export const authController = {
  me(req: AuthenticatedRequest, res: Response) {
    res.json({ user: authService.sanitizeUser(req.user!) })
  },
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body)
      setSessionCookie(res, result.token)
      res.status(201).json({
        message: 'Registration successful.',
        user: result.user,
      })
    } catch (error) {
      res.status(409).json({
        message: error instanceof Error ? error.message : 'Unable to register.',
      })
    }
  },
  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body)
      setSessionCookie(res, result.token)
      res.json({
        message: 'Login successful.',
        user: result.user,
      })
    } catch (error) {
      res.status(401).json({
        message: error instanceof Error ? error.message : 'Unable to login.',
      })
    }
  },
  async logout(req: Request, res: Response) {
    const cookies = parseCookies(req.headers.cookie)
    const token = cookies[env.sessionCookieName]
    await authService.logout(token)
    clearSessionCookie(res)
    res.json({ message: 'Logged out successfully.' })
  },
}
