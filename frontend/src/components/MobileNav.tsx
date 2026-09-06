import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Armchair, Users, ClipboardCheck, Settings as SettingsIcon, Menu, X, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/seats', label: 'Seats', icon: Armchair },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export function MobileTopBar() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="font-display text-sm font-medium text-foreground">Bookshome</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover text-muted">
          <User className="h-4 w-4" />
        </div>
      </div>
      {open && (
        <div className="border-t border-border px-4 py-2">
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
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-hover hover:text-foreground',
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
    </div>
  )
}

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}