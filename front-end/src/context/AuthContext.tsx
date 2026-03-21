import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { apiFetch } from '../lib/api'
import type { AuthUser } from '../lib/api'

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await apiFetch<{ user: AuthUser }>('/api/auth/me')
        setUser(response.user)
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadSession()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async login(email, password) {
        const response = await apiFetch<{ user: AuthUser }>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        })
        setUser(response.user)
      },
      async register(name, email, password) {
        const response = await apiFetch<{ user: AuthUser }>('/api/auth/register', {
          method: 'POST',
          body: { name, email, password },
        })
        setUser(response.user)
      },
      async logout() {
        await apiFetch<{ message: string }>('/api/auth/logout', {
          method: 'POST',
        })
        setUser(null)
      },
    }),
    [isLoading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
