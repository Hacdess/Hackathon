import type { NextFunction, Request, Response } from 'express'
import { env, isProduction } from '../config/env'
import { authService } from '../services/authService'
import { parseCookies } from './cookie'
import type { SessionUser } from '../types/domain'

export type AuthenticatedRequest = Request & {
  user?: SessionUser
}

function extractBearerToken(authHeader?: string) {
  if (!authHeader?.startsWith('Bearer ')) {
    return undefined
  }

  const token = authHeader.slice('Bearer '.length).trim()
  return token || undefined
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(env.sessionCookieName, token, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(env.sessionCookieName, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  })
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[env.sessionCookieName] || extractBearerToken(req.headers.authorization)

  if (!token) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const user = await authService.getUserBySessionToken(token)

  if (!user) {
    clearSessionCookie(res)
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  req.user = user
  next()
}
