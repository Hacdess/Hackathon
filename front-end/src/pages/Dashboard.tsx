import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'

const statCards = [
  { label: 'Total products', value: '2,842', delta: '+4.5%', icon: 'solar:box-minimalistic-linear' },
  { label: 'Categories', value: '36', delta: null, icon: 'solar:folder-with-files-linear' },
  { label: 'Units in stock', value: '15,920', delta: '+12%', icon: 'solar:layers-linear' },
  {
    label: 'Low stock alerts',
    value: '12',
    delta: 'items',
    icon: 'solar:danger-triangle-bold',
    danger: true,
  },
]

const chartBars = [
  { label: 'Mon', inboundHeight: '40%', outboundHeight: '60%' },
  { label: 'Tue', inboundHeight: '50%', outboundHeight: '75%' },
  { label: 'Wed', inboundHeight: '30%', outboundHeight: '45%' },
  { label: 'Thu', inboundHeight: '60%', outboundHeight: '90%' },
  { label: 'Fri', inboundHeight: '40%', outboundHeight: '65%' },
  { label: 'Sat', inboundHeight: '20%', outboundHeight: '35%' },
  { label: 'Sun', inboundHeight: '15%', outboundHeight: '25%' },
]

const activities = [
  {
    title: 'Received 50 MacBook Pro units',
    meta: '10 minutes ago • Main warehouse',
    icon: 'solar:import-bold',
    tone: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: 'Out of stock: AirPods Pro',
    meta: '2 hours ago • Needs replenishment',
    icon: 'solar:danger-circle-bold',
    tone: 'bg-red-50 text-red-600',
  },
  {
    title: 'Added new item: iPad Air M2',
    meta: 'Yesterday • Trung Kien Le',
    icon: 'solar:add-square-bold',
    tone: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Updated iPhone 15 pricing',
    meta: '2 days ago • Administrator',
    icon: 'solar:pen-bold',
    tone: 'bg-slate-100 text-slate-600',
  },
]

export default function DashboardTab() {
  return (
    <div className="mx-auto max-w-6xl p-10">
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black tracking-tight text-[#0f1724]">
            Good morning, Kien!
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
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
                <Icon icon={card.icon} className="text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span
                className={[
                  'font-heading text-3xl font-black',
                  card.danger ? 'text-red-600' : 'text-[#0f1724]',
                ].join(' ')}
              >
                {card.value}
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
              <h2 className="font-heading text-xl font-bold text-[#0f1724]">Inventory movement</h2>
              <p className="text-sm text-slate-500">Last 7 days</p>
            </div>
            <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold outline-none">
              <option>This week</option>
              <option>This month</option>
            </select>
          </div>

          <div className="flex h-64 items-end justify-between gap-4">
            {chartBars.map((bar) => (
              <div key={bar.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="w-full rounded-t-lg bg-primary/20" style={{ height: bar.inboundHeight }} />
                <div className="w-full rounded-t-lg bg-primary" style={{ height: bar.outboundHeight }} />
                <span className="text-center text-[10px] font-bold text-slate-400">{bar.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary/20" />
              <span className="text-xs font-medium text-slate-500">Incoming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="text-xs font-medium text-slate-500">Outgoing</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="mb-6 font-heading text-xl font-bold text-[#0f1724]">Activity</h2>
          <div className="space-y-6">
            {activities.map((activity) => (
              <div key={activity.title} className="flex gap-4">
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
