import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Armchair, Users, ClipboardCheck, Settings as SettingsIcon, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/seats', label: 'Seat map', icon: Armchair },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]
export function Nav() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="border-b border-border bg-surface/50 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3 md:justify-start md:gap-1">
        {/* Desktop: inline links, hidden below md */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-surface-hover hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
        {/* Mobile: brand-ish placeholder left, hamburger toggle right, hidden from md up */}
        <span className="font-display text-sm font-medium text-foreground md:hidden">
          Bookshome
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="flex items-center justify-center rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {/* Mobile dropdown panel, stacked links, only below md */}
      {open && (
        <div className="border-t border-border px-6 py-2 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:bg-surface-hover hover:text-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}