import crypto from 'crypto'
import { authRepository } from '../repositories/authRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import type { PublicUser, SessionUser } from '../types/domain'

const HASH_PREFIX = 'scrypt:'

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${HASH_PREFIX}${salt}:${derivedKey}`
}

function isHashedPassword(value: string) {
  return value.startsWith(HASH_PREFIX)
}

function verifyPassword(password: string, storedPassword: string) {
  if (!isHashedPassword(storedPassword)) {
    return password === storedPassword
  }

  const payload = storedPassword.slice(HASH_PREFIX.length)
  const [salt, expectedKey] = payload.split(':')
  if (!salt || !expectedKey) {
    return false
  }
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(expectedKey, 'hex'))
}

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
      password: hashPassword(password),
    })

    const token = crypto.randomBytes(24).toString('hex')
    await sessionRepository.save(token, user.id)

    return { user: sanitizeUser(user), token }
  },
  async login(input: { email?: string; password?: string }) {
    const { email, password } = input
    if (!email || !password) {
      throw new Error('Invalid email or password.')
    }

    const user = email ? await authRepository.findByEmail(email) : undefined

    if (!user || !verifyPassword(password, user.password)) {
      throw new Error('Invalid email or password.')
    }

    if (!isHashedPassword(user.password)) {
      await authRepository.updatePassword(user.id, hashPassword(password))
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
