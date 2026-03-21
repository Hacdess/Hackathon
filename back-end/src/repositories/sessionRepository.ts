import { sessions } from '../data/store'

export const sessionRepository = {
  getUserIdByToken(token: string) {
    return sessions.get(token)
  },
  save(token: string, userId: string) {
    sessions.set(token, userId)
  },
  delete(token: string) {
    sessions.delete(token)
  },
}
