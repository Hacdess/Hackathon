import { Icon } from '@iconify/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import type { DashboardResponse } from '../lib/api'

const cardIcons: Record<string, string> = {
  'Total products': 'solar:box-minimalistic-linear',
  Categories: 'solar:folder-with-files-linear',
  'Units in stock': 'solar:layers-linear',
  'Low stock alerts': 'solar:danger-triangle-bold',
}

export default function DashboardTab() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await apiFetch<DashboardResponse>('/api/dashboard')
        setDashboard(response)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.')
      }
    }

    void loadDashboard()
  }, [])

  const maxMovement = useMemo(() => {
    if (!dashboard) {
      return 1
    }

    return Math.max(
      1,
      ...dashboard.movement.flatMap((bar) => [bar.incoming, bar.outgoing]),
    )
  }, [dashboard])

  return (
    <div className="mx-auto max-w-6xl p-10">
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black tracking-tight text-[#0f1724]">
            Good morning, {user?.name ?? 'Seller'}!
          </h1>
          <p className="mt-2 text-slate-500">
            Here is what is happening across your store and inventory today.
          </p>
        </div>
        <Link
          to="/products/new"
          className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Icon icon="hugeicons:add-01" className="text-xl" />
          Create product
        </Link>
      </header>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {(dashboard?.stats ?? []).map((card) => (
          <div
            key={card.label}
            className={[
              'group rounded-2xl border bg-white p-6 transition-all hover:shadow-lg',
              card.danger ? 'border-red-100' : 'border-slate-200 hover:border-primary/50',
            ].join(' ')}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span
                className={[
                  'text-xs font-bold uppercase tracking-wider',
                  card.danger ? 'text-red-500' : '',
                ].join(' ')}
              >
                {card.label}
              </span>
              <div
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                  card.danger
                    ? 'bg-red-50 text-red-500'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary',
                ].join(' ')}
              >
                <Icon icon={cardIcons[card.label] ?? 'solar:widget-5-linear'} className="text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span
                className={[
                  'font-heading text-3xl font-black',
                  card.danger ? 'text-red-600' : 'text-[#0f1724]',
                ].join(' ')}
              >
                {card.value.toLocaleString()}
              </span>
              {card.delta ? (
                <span
                  className={[
                    'text-xs font-bold',
                    card.danger ? 'text-slate-400' : 'text-emerald-500',
                  ].join(' ')}
                >
                  {card.delta}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-[#0f1724]">Catalog activity</h2>
              <p className="text-sm text-slate-500">Last 7 days</p>
            </div>
          </div>

          <div className="flex h-64 items-end justify-between gap-4">
            {(dashboard?.movement ?? []).map((bar) => (
              <div key={bar.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div
                  className="w-full rounded-t-lg bg-primary/20"
                  style={{ height: `${(bar.incoming / maxMovement) * 100}%` }}
                />
                <div
                  className="w-full rounded-t-lg bg-primary"
                  style={{ height: `${(bar.outgoing / maxMovement) * 100}%` }}
                />
                <span className="text-center text-[10px] font-bold text-slate-400">{bar.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary/20" />
              <span className="text-xs font-medium text-slate-500">New products</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="text-xs font-medium text-slate-500">Product updates</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="mb-6 font-heading text-xl font-bold text-[#0f1724]">Activity</h2>
          <div className="space-y-6">
            {(dashboard?.activities ?? []).map((activity) => (
              <div key={`${activity.timestamp}-${activity.title}`} className="flex gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${activity.tone}`}>
                  <Icon icon={activity.icon} className="text-lg" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-[#0f1724]">{activity.title}</p>
                  <span className="text-xs text-slate-500">{activity.meta}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-8 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
            View full log
          </button>
        </div>
      </div>
    </div>
  )
}
