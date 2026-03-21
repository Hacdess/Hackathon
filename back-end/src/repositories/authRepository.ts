import { users } from '../data/store'
import type { SessionUser } from '../types/domain'

export const authRepository = {
  findByEmail(email: string) {
    return users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  },
  findById(id: string) {
    return users.find((user) => user.id === id)
  },
  create(user: SessionUser) {
    users.push(user)
    return user
  },
}
