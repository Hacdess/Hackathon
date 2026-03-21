import { Icon } from '@iconify/react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AssistantWidget } from './AssistantWidget'
import { useAuth } from '../context/AuthContext'

const navigationItems = [
  {
    to: '/dashboard',
    label: 'Dashboard overview',
    activeIcon: 'solar:widget-5-bold',
    inactiveIcon: 'solar:widget-5-linear',
  },
  {
    to: '/products',
    label: 'Product list',
    activeIcon: 'solar:box-bold',
    inactiveIcon: 'solar:box-linear',
  },
  {
    to: '/categories',
    label: 'Categories',
    activeIcon: 'solar:folder-with-files-bold',
    inactiveIcon: 'solar:folder-with-files-linear',
  },
]

export function Layout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen w-full bg-background font-sans text-foreground">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-[#0f1724] text-slate-300">
        <div className="flex h-20 items-center px-8">
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
              <Icon icon="solar:box-minimalistic-bold" className="text-2xl" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight">LogiKho</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6">
          <div className="mb-4 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Main menu
          </div>
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all',
                  isActive
                    ? 'bg-primary font-semibold text-white shadow-md shadow-primary/10'
                    : 'font-medium text-slate-400 hover:bg-white/5 hover:text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    icon={isActive ? item.activeIcon : item.inactiveIcon}
                    className="text-xl"
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-6">
          <div className="flex items-center gap-3">
            <img
              src="https://lh3.googleusercontent.com/a/ACg8ocK84wvb0qdNlsBef16Ik82AYcLpP29hIbSVLrI_PV91ac0djQh8=s96-c"
              alt={user?.name ?? 'Seller profile'}
              className="h-10 w-10 rounded-full border-2 border-slate-700 object-cover"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase text-white">{user?.name ?? 'Seller'}</span>
              <span className="text-[11px] font-medium text-slate-500">{user?.email ?? 'Active session'}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative flex-1 bg-slate-50/50">
        <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-10 backdrop-blur-md">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Seller workspace</p>
            <p className="text-sm font-medium text-slate-500">Manage catalog, taxes, and AI-assisted workflows</p>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
          >
            <Icon icon="solar:logout-linear" className="text-lg" />
            Sign out
          </button>
        </div>

        <main className="overflow-y-auto">
          <Outlet />
        </main>

        <AssistantWidget />
      </div>
    </div>
  )
}
