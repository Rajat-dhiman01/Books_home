import { Crown, Clock, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress-ring'
import { useMemberInfo } from './MemberLayout'

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

export default function Membership() {
  const { info } = useMemberInfo()
  const { membership, plan, shift } = info

  if (!membership) {
    return (
      <div className="px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="font-display text-2xl font-medium text-foreground">Membership</div>
          <Card className="mt-4 animate-fade-in">
            <CardContent className="py-8 text-center">
              <CardTitle className="text-base">No active membership</CardTitle>
              <CardDescription className="mt-1">
                You don't have a membership active today. Please contact library staff.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const today = todayIso()
  const daysLeft = Math.max(0, daysBetween(today, membership.endDate))
  const totalDays = Math.max(1, daysBetween(membership.startDate, membership.endDate) + 1)
  const ringPercent = (daysLeft / totalDays) * 100

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="font-display text-2xl font-medium text-foreground">Membership</div>

        <div className="grid animate-fade-in gap-4 sm:grid-cols-[1fr_auto] sm:items-stretch">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{plan?.name ?? 'Membership'}</CardTitle>
                    <CardDescription>
                      {shift ? `${shift.startTime.slice(0, 5)} \u2013 ${shift.endTime.slice(0, 5)}` : ''}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={membership.status === 'ACTIVE' ? 'accent' : 'default'}>{membership.status}</Badge>
              </div>
            </CardHeader>
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

        <Card className="animate-fade-in" style={{ animationDelay: '60ms' }}>
          <CardHeader>
            <CardTitle className="text-base">Membership period</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted">
                <CalendarDays className="h-4 w-4" />
                Start date
              </span>
              <span className="text-foreground">{formatDate(membership.startDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted">
                <CalendarDays className="h-4 w-4" />
                End date
              </span>
              <span className="text-foreground">{formatDate(membership.endDate)}</span>
            </div>
            {shift && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted">
                  <Clock className="h-4 w-4" />
                  Shift
                </span>
                <span className="text-foreground">
                  {`${shift.name} \u00b7 ${shift.startTime.slice(0, 5)}\u2013${shift.endTime.slice(0, 5)}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}