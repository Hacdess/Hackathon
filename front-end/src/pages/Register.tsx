import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await register(name, email, password)
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to register.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-900/10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Register</p>
            <h1 className="mt-3 font-heading text-3xl font-black text-slate-950">
              Create your seller account
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Start managing products, categories, and tax-ready records.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                placeholder="Trung Kien Le"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                placeholder="you@store.com"
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
                placeholder="Choose a password"
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
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-primary">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden w-1/2 flex-col justify-between bg-[#0f1724] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/20">
            <Icon icon="solar:magic-stick-3-bold" className="text-2xl" />
          </div>
          <div>
            <div className="font-heading text-2xl font-black tracking-tight">LogiKho AI</div>
            <div className="text-sm text-slate-400">Operations + tax assistant</div>
          </div>
        </div>

        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/80">
            Start fast
          </p>
          <h2 className="mt-4 font-heading text-5xl font-black leading-tight">
            Onboard your store with a workspace ready for inventory and tax support.
          </h2>
          <p className="mt-6 text-lg text-slate-300">
            Register once and the backend will keep your session token in cookies for future requests.
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          Your dashboard routes will stay protected until a valid login session exists.
        </div>
      </div>
    </div>
  )
}
