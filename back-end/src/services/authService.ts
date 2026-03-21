import crypto from 'crypto'
import { authRepository } from '../repositories/authRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import type { PublicUser, SessionUser } from '../types/domain'

function sanitizeUser(user: SessionUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  }
}

export const authService = {
  sanitizeUser,
  getUserBySessionToken(token: string) {
    const userId = sessionRepository.getUserIdByToken(token)
    if (!userId) {
      return null
    }

    return authRepository.findById(userId) ?? null
  },
  register(input: { name?: string; email?: string; password?: string }) {
    const { name, email, password } = input

    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required.')
    }

    if (authRepository.findByEmail(email)) {
      throw new Error('An account with this email already exists.')
    }

    const user = authRepository.create({
      id: crypto.randomUUID(),
      name,
      email,
      password,
    })

    const token = crypto.randomBytes(24).toString('hex')
    sessionRepository.save(token, user.id)

    return { user: sanitizeUser(user), token }
  },
  login(input: { email?: string; password?: string }) {
    const { email, password } = input
    const user = email ? authRepository.findByEmail(email) : undefined

    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.')
    }

    const token = crypto.randomBytes(24).toString('hex')
    sessionRepository.save(token, user.id)

    return { user: sanitizeUser(user), token }
  },
  logout(token?: string) {
    if (token) {
      sessionRepository.delete(token)
    }
  },
}
