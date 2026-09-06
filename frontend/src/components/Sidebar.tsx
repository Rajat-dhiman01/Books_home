import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Armchair, Users, ClipboardCheck, Settings as SettingsIcon, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HERO_IMAGE_URL, heroBackgroundStyle } from '@/lib/branding'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/seats', label: 'Seat map', icon: Armchair },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

// Placeholder until Supabase Auth is wired (Priority 7) — replace with the real signed-in user.
const CURRENT_USER = { name: 'Rajat Dhiman', role: 'Admin' }

export function Sidebar() {
  return (
    <aside className="hidden shrink-0 border-r border-border bg-surface/50 lg:flex lg:w-64 lg:flex-col">
      <div className="px-6 py-6">
        <div className="font-display text-lg font-medium text-foreground">Bookshome</div>
        <div className="mt-0.5 text-xs font-medium uppercase tracking-[0.2em] text-muted">Rishikesh</div>
      </div>

      <nav className="space-y-1 px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-hover hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Fills the remaining sidebar space with the same hero imagery/gradient
          used on the Dashboard, for visual consistency between the two. */}
      <div className="min-h-0 flex-1 px-3 py-4">
        <div
          className="relative h-full min-h-[180px] overflow-hidden rounded-xl border border-border bg-cover bg-center"
          style={heroBackgroundStyle(HERO_IMAGE_URL)}
        >
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">Study &middot; Focus &middot; Grow</div>
            <div className="mt-1 font-display text-lg font-medium text-white">A quieter you</div>
          </div>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-hover"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
            {CURRENT_USER.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">{CURRENT_USER.name}</div>
            <div className="truncate text-xs text-muted">{CURRENT_USER.role}</div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
        </button>
      </div>
    </aside>
  )
}