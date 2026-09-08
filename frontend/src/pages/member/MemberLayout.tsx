import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom'
import { Home, CalendarDays, IdCard, Armchair, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchMemberMe, getMemberAccessToken, type MemberMeResponse } from '@/lib/memberApi'
import { supabase } from '@/lib/supabaseClient'

const tabs = [
  { to: '/member/dashboard', label: 'Home', icon: Home },
  { to: '/member/attendance', label: 'Attendance', icon: CalendarDays },
  { to: '/member/membership', label: 'Membership', icon: IdCard },
  { to: '/member/seat', label: 'Seat', icon: Armchair },
  { to: '/member/profile', label: 'Profile', icon: User },
]

export interface MemberOutletContext {
  info: MemberMeResponse
  reload: () => Promise<void>
}

// Child pages call this to read the shared /member/me data fetched once by
// the layout, instead of each page issuing its own request.
export function useMemberInfo(): MemberOutletContext {
  return useOutletContext<MemberOutletContext>()
}

function LayoutSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  )
}

export default function MemberLayout() {
  const navigate = useNavigate()
  const [info, setInfo] = useState<MemberMeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const token = await getMemberAccessToken()
    if (!token) {
      navigate('/member/login', { replace: true })
      return
    }
    try {
      const me = await fetchMemberMe(token)
      setInfo(me)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your details.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    load()
  }, [load])

  // If the session disappears (expired, or signed out in another tab), send
  // the member back to login rather than showing stale data on any tab.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/member/login', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  if (loading) return <LayoutSkeleton />

  if (error || !info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center text-sm text-danger">{error ?? 'Could not load your details.'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Outlet context={{ info, reload: load } satisfies MemberOutletContext} />

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
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
    </div>
  )
}