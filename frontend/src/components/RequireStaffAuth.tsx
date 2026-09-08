import { useEffect, useState, createContext, useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { fetchStaffMe, signOutStaff, type StaffProfile } from '@/lib/staffAuth'
import { supabase } from '@/lib/supabaseClient'

const StaffContext = createContext<StaffProfile | null>(null)

// Any staff page can call this to get the logged-in staff member's own
// profile (name, role) without re-fetching — e.g. Sidebar uses it for the
// account name, and the Staff Accounts page uses .role to show/hide the
// "Add admin" button.
export function useStaffProfile(): StaffProfile {
  const staff = useContext(StaffContext)
  if (!staff) throw new Error('useStaffProfile must be used inside RequireStaffAuth')
  return staff
}

function LayoutSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  )
}

export function RequireStaffAuth({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<StaffProfile | null>(null)
  const [status, setStatus] = useState<'checking' | 'ok' | 'redirect'>('checking')

  useEffect(() => {
    let cancelled = false

    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        if (!cancelled) setStatus('redirect')
        return
      }
      try {
        const profile = await fetchStaffMe()
        if (!cancelled) {
          setStaff(profile)
          setStatus('ok')
        }
      } catch {
        // Session exists but isn't a staff account (e.g. a leftover member
        // portal login, or a revoked staff account) — clear it so the
        // login form starts fresh instead of looping on the same error.
        await signOutStaff().catch(() => {})
        if (!cancelled) setStatus('redirect')
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'checking') return <LayoutSkeleton />
  if (status === 'redirect') return <Navigate to="/staff/login" replace />

  return <StaffContext.Provider value={staff}>{children}</StaffContext.Provider>
}