import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Armchair, Clock, CheckCircle2, AlarmClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchMemberMe,
  memberCheckIn,
  memberCheckOut,
  signOutMember,
  getMemberAccessToken,
  type MemberMeResponse,
} from '@/lib/memberApi'
import { supabase } from '@/lib/supabaseClient'

function formatTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  )
}

export default function MemberDashboard() {
  const navigate = useNavigate()
  const [info, setInfo] = useState<MemberMeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const token = await getMemberAccessToken()
    if (!token) {
      navigate('/member/login', { replace: true })
      return
    }
    try {
      const data = await fetchMemberMe(token)
      setInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your details.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    load()
  }, [load])

  // If the session disappears (expired, or signed out in another tab),
  // send the member back to login rather than showing stale data.
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

  async function handleCheckIn() {
    setActionError(null)
    setActionPending(true)
    try {
      const token = await getMemberAccessToken()
      if (!token) return navigate('/member/login', { replace: true })
      await memberCheckIn(token)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Check-in failed.')
    } finally {
      setActionPending(false)
    }
  }

  async function handleCheckOut() {
    setActionError(null)
    setActionPending(true)
    try {
      const token = await getMemberAccessToken()
      if (!token) return navigate('/member/login', { replace: true })
      await memberCheckOut(token)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Check-out failed.')
    } finally {
      setActionPending(false)
    }
  }

  async function handleSignOut() {
    await signOutMember()
    navigate('/member/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-lg font-medium text-foreground">
              {loading ? <Skeleton className="h-6 w-32" /> : `Hi, ${info?.member.fullName.split(' ')[0]}`}
            </div>
            <div className="text-xs text-muted">Bookshome Member Portal</div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>

        {loading && <DashboardSkeleton />}

        {!loading && error && (
          <Card className="animate-fade-in">
            <CardContent className="py-6 text-center text-sm text-danger">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && info && !info.membership && (
          <Card className="animate-fade-in">
            <CardContent className="py-8 text-center">
              <CardTitle className="text-base">No active membership</CardTitle>
              <CardDescription className="mt-1">
                You don't have a membership active today. Please contact library staff.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {!loading && !error && info && info.membership && (
          <>
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{info.plan?.name ?? 'Membership'}</CardTitle>
                    <CardDescription>
                      {info.shift ? `${info.shift.name} · ${info.shift.startTime.slice(0, 5)}–${info.shift.endTime.slice(0, 5)}` : ''}
                    </CardDescription>
                  </div>
                  <Badge variant={info.membership.status === 'ACTIVE' ? 'accent' : 'default'}>
                    {info.membership.status}
                  </Badge>
                </div>
              </CardHeader>
              {info.seat && (
                <CardContent className="flex items-center gap-2 pt-0 text-sm text-muted">
                  <Armchair className="h-4 w-4" />
                  Seat {info.seat.seatNumber}
                  <span className="text-xs text-muted">({info.seat.assignmentType.toLowerCase()})</span>
                </CardContent>
              )}
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '60ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Today</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                {!info.todayAttendance && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Clock className="h-4 w-4" />
                      You haven't checked in today.
                    </div>
                    <Button type="button" className="w-full" disabled={actionPending} onClick={handleCheckIn}>
                      {actionPending ? 'Checking in…' : 'Check in'}
                    </Button>
                  </>
                )}

                {info.todayAttendance && !info.todayAttendance.checkOutAt && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Checked in at {formatTime(info.todayAttendance.checkInAt)}
                    </div>
                    <Button type="button" className="w-full" disabled={actionPending} onClick={handleCheckOut}>
                      {actionPending ? 'Checking out…' : 'Check out'}
                    </Button>
                  </>
                )}

                {info.todayAttendance?.checkOutAt && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <AlarmClock className="h-4 w-4 text-accent" />
                    Checked in {formatTime(info.todayAttendance.checkInAt)} · checked out{' '}
                    {formatTime(info.todayAttendance.checkOutAt)}
                  </div>
                )}

                {actionError && <p className="text-sm text-danger">{actionError}</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}