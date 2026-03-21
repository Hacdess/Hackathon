import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('seller@example.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await login(email, password)
      navigate(redirectTo || '/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="hidden flex-1 flex-col justify-between bg-[#0f1724] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/20">
            <Icon icon="solar:box-minimalistic-bold" className="text-2xl" />
          </div>
          <div>
            <div className="font-heading text-2xl font-black tracking-tight">LogiKho</div>
            <div className="text-sm text-slate-400">Seller operations + tax copilot</div>
          </div>
        </div>
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/80">
            Welcome back
          </p>
          <h1 className="mt-4 font-heading text-5xl font-black leading-tight">
            Sign in to manage inventory, invoices, and tax workflows.
          </h1>
          <p className="mt-6 text-lg text-slate-300">
            Use the demo account or create your own seller profile to explore the dashboard.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          Demo account: <span className="text-slate-300">seller@example.com / password123</span>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-slate-50 px-6 py-12 lg:max-w-xl">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Login</p>
            <h2 className="mt-3 font-heading text-3xl font-black text-slate-950">Access your workspace</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to continue to your store dashboard.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                placeholder="seller@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                placeholder="Enter your password"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Need an account?{' '}
            <Link to="/register" className="font-bold text-primary">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
