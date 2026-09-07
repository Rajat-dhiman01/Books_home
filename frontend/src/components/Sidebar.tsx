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
    <aside
      className="hidden shrink-0 border-r border-border bg-cover bg-center lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col"
      style={heroBackgroundStyle(HERO_IMAGE_URL)}
    >
      <div className="px-6 py-6">
        <div className="font-display text-lg font-medium text-white">Bookshome</div>
        <div className="mt-0.5 text-xs font-medium uppercase tracking-[0.2em] text-white/60">Rishikesh</div>
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
                isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Empty space over the mountain image — mirrors Dashboard's hero tagline. */}
      <div className="flex flex-1 flex-col justify-end px-6 pb-6">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">Study &middot; Focus &middot; Grow</div>
        <div className="mt-1 font-display text-lg font-medium text-white">A quieter you</div>
      </div>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/10"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-medium text-white">
            {CURRENT_USER.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{CURRENT_USER.name}</div>
            <div className="truncate text-xs text-white/60">{CURRENT_USER.role}</div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-white/60" />
        </button>
      </div>
    </aside>
  )
}