import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Armchair, Clock, CheckCircle2, AlarmClock, Crown, CalendarDays, ChevronRight, Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress-ring'
import { Meteors } from '@/components/Meteors'
import { memberCheckIn, memberCheckOut, getMemberAccessToken } from '@/lib/memberApi'
import { useMemberInfo } from './MemberLayout'

function formatTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function parseDateOnly(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(dateStr: string) {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysBetween(fromStr: string, toStr: string) {
  const ms = parseDateOnly(toStr).getTime() - parseDateOnly(fromStr).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Home() {
  const navigate = useNavigate()
  const { info, reload } = useMemberInfo()
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleCheckIn() {
    setActionError(null)
    setActionPending(true)
    try {
      const token = await getMemberAccessToken()
      if (!token) return navigate('/member/login', { replace: true })
      await memberCheckIn(token)
      await reload()
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
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Check-out failed.')
    } finally {
      setActionPending(false)
    }
  }

  const today = todayIso()
  const daysLeft = info.membership ? Math.max(0, daysBetween(today, info.membership.endDate)) : 0
  const totalMembershipDays = info.membership
    ? Math.max(1, daysBetween(info.membership.startDate, info.membership.endDate) + 1)
    : 1
  const ringPercent = info.membership ? (daysLeft / totalMembershipDays) * 100 : 0

  return (
    <div className="relative overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      {/* Subtle ambient motion behind the header only — a small nod to the
          "quieter you" / focus branding used elsewhere in the app, kept
          faint so it never competes with the actual information. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden opacity-40">
        <Meteors count={10} />
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-2xl font-medium text-foreground">
              Hi, {info.member.fullName.split(' ')[0]}
            </div>
            <div className="mt-1 text-sm text-muted">Good to see you back.</div>
          </div>
          <div className="text-right text-xs text-muted">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {!info.membership && (
          <Card className="animate-fade-in">
            <CardContent className="py-8 text-center">
              <CardTitle className="text-base">No active membership</CardTitle>
              <CardDescription className="mt-1">
                You don't have a membership active today. Please contact library staff.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {info.membership && (
          <>
            {/* Plan summary + days-left ring */}
            <div className="grid animate-fade-in gap-4 sm:grid-cols-[1fr_auto] sm:items-stretch">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Crown className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>{info.plan?.name ?? 'Membership'}</CardTitle>
                        <CardDescription>
                          {info.shift ? `${info.shift.startTime.slice(0, 5)} \u2013 ${info.shift.endTime.slice(0, 5)}` : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={info.membership.status === 'ACTIVE' ? 'accent' : 'default'}>
                      {info.membership.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-0 text-sm text-muted">
                  {info.seat && (
                    <span className="flex items-center gap-1.5">
                      <Armchair className="h-4 w-4" />
                      Seat {info.seat.seatNumber}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    Member since {formatDate(info.member.createdAt.slice(0, 10))}
                  </span>
                  <span>Valid till {formatDate(info.membership.endDate)}</span>
                </CardContent>
              </Card>

              <Card className="flex items-center justify-center p-4 sm:w-40">
                <ProgressRing
                  percent={ringPercent}
                  label={`${daysLeft}`}
                  sublabel="days left"
                  ringClassName={daysLeft <= 3 ? 'text-danger' : 'text-accent'}
                />
              </Card>
            </div>

            {/* Today's check-in status */}
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
                      {actionPending ? 'Checking in\u2026' : 'Check in'}
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
                      {actionPending ? 'Checking out\u2026' : 'Check out'}
                    </Button>
                  </>
                )}

                {info.todayAttendance?.checkOutAt && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <AlarmClock className="h-4 w-4 text-accent" />
                    {`Checked in ${formatTime(info.todayAttendance.checkInAt)} \u00b7 checked out ${formatTime(info.todayAttendance.checkOutAt)}`}
                  </div>
                )}

                {actionError && <p className="text-sm text-danger">{actionError}</p>}
              </CardContent>
            </Card>

            {/* Today's schedule timeline */}
            {info.shift && (
              <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Today's schedule</CardTitle>
                    {info.plan && <span className="text-xs text-muted">{info.plan.name}</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-0 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="h-2 w-2 rounded-full bg-muted" />
                      Library opens
                    </span>
                    <span className="text-foreground">{info.shift.startTime.slice(0, 5)}</span>
                  </div>
                  {info.todayAttendance?.checkInAt && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-foreground">
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        You checked in
                      </span>
                      <span className="text-foreground">{formatTime(info.todayAttendance.checkInAt)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="h-2 w-2 rounded-full bg-muted" />
                      Library closes
                    </span>
                    <span className="text-foreground">{info.shift.endTime.slice(0, 5)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick actions */}
            <div className="grid animate-fade-in gap-3 sm:grid-cols-2" style={{ animationDelay: '140ms' }}>
              <button
                type="button"
                onClick={() => navigate('/member/attendance')}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">View attendance</span>
                    <span className="block text-xs text-muted">This month, day by day</span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </button>

              {/* Honest placeholder — no timer feature exists yet, this just
                  reserves the spot for it rather than pretending it works. */}
              <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-surface/50 px-4 py-3.5 opacity-70">
                <span className="flex items-center gap-3">
                  <Timer className="h-4 w-4 text-muted" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">Focus timer</span>
                    <span className="block text-xs text-muted">Coming soon</span>
                  </span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}