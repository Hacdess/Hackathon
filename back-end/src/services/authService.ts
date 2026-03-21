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
  async getUserBySessionToken(token: string) {
    const userId = await sessionRepository.getUserIdByToken(token)
    if (!userId) {
      return null
    }

    return (await authRepository.findById(userId)) ?? null
  },
  async register(input: { name?: string; email?: string; password?: string }) {
    const { name, email, password } = input

    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required.')
    }

    if (await authRepository.findByEmail(email)) {
      throw new Error('An account with this email already exists.')
    }

    const user = await authRepository.create({
      id: crypto.randomUUID(),
      name,
      email,
      password,
    })

    const token = crypto.randomBytes(24).toString('hex')
    await sessionRepository.save(token, user.id)

    return { user: sanitizeUser(user), token }
  },
  async login(input: { email?: string; password?: string }) {
    const { email, password } = input
    const user = email ? await authRepository.findByEmail(email) : undefined

    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.')
    }

    const token = crypto.randomBytes(24).toString('hex')
    await sessionRepository.save(token, user.id)

    return { user: sanitizeUser(user), token }
  },
  async logout(token?: string) {
    if (token) {
      await sessionRepository.delete(token)
    }
  },
}
