import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Armchair } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/seats', label: 'Seat map', icon: Armchair },
]

export function Nav() {
  return (
    <nav className="border-b border-border bg-surface/50 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-6 py-3">
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
    </nav>
  )
}