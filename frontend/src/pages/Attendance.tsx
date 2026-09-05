import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, X as XIcon } from 'lucide-react'
import {
  fetchMembers,
  fetchMemberships,
  fetchMembershipPlans,
  fetchAttendanceForDate,
  createAttendance,
  updateAttendance,
  type Member,
  type Membership,
  type MembershipPlan,
  type AttendanceRecord,
  type AttendanceStatus,
} from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Attendance() {
  const [date, setDate] = useState(todayIso())
  const [members, setMembers] = useState<Member[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([fetchMembers(), fetchMemberships(), fetchMembershipPlans(), fetchAttendanceForDate(date)])
      .then(([m, ms, p, a]) => {
        setMembers(m)
        setMemberships(ms)
        setPlans(p)
        setAttendance(a)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [date])

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans])
  const attendanceByMembershipId = useMemo(
    () => new Map(attendance.map((a) => [a.membershipId, a])),
    [attendance],
  )

  const activeToday = useMemo(
    () =>
      memberships
        .filter((m) => m.status !== 'CANCELLED' && date >= m.startDate && date <= m.endDate)
        .map((m) => ({
          membership: m,
          member: memberById.get(m.memberId),
          plan: planById.get(m.membershipPlanId),
          record: attendanceByMembershipId.get(m.id),
        }))
        .sort((a, b) => (a.member?.fullName ?? '').localeCompare(b.member?.fullName ?? '')),
    [memberships, date, memberById, planById, attendanceByMembershipId],
  )

  async function mark(membershipId: string, status: AttendanceStatus) {
    const existing = attendanceByMembershipId.get(membershipId)
    if (existing && existing.status === status) return // already set, no-op

    setSavingId(membershipId)
    try {
      if (existing) {
        const updated = await updateAttendance(existing.id, { status })
        setAttendance((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      } else {
        const created = await createAttendance({ membershipId, attendanceDate: date, status })
        setAttendance((prev) => [...prev, created])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Attendance</h1>
          <p className="mt-2 text-muted">Mark who showed up, for any date.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto pl-9"
            />
          </div>
          {date !== todayIso() && (
            <Button variant="outline" size="sm" onClick={() => setDate(todayIso())}>
              Back to today
            </Button>
          )}
        </div>

        {error && (
          <Card className="mb-6 border-danger/30 bg-danger/5">
            <CardContent className="pt-5 text-danger">{error}</CardContent>
          </Card>
        )}

        {loading && <div className="text-muted">Loading attendance.</div>}

        {!loading && (
          <div className="flex flex-col gap-3">
            {activeToday.map(({ membership, member, plan, record }) => (
              <Card key={membership.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {member?.fullName ?? 'Unknown member'}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {plan && <Badge variant="default">{plan.name}</Badge>}
                      {record && (
                        <Badge variant={record.status === 'PRESENT' ? 'accent' : 'danger'}>
                          {record.status === 'PRESENT' ? 'Present' : 'Absent'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant={record?.status === 'PRESENT' ? 'primary' : 'outline'}
                      size="sm"
                      disabled={savingId === membership.id}
                      onClick={() => mark(membership.id, 'PRESENT')}
                    >
                      <Check className="h-4 w-4" />
                      Present
                    </Button>
                    <Button
                      variant={record?.status === 'ABSENT' ? 'primary' : 'outline'}
                      size="sm"
                      disabled={savingId === membership.id}
                      onClick={() => mark(membership.id, 'ABSENT')}
                    >
                      <XIcon className="h-4 w-4" />
                      Absent
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {activeToday.length === 0 && (
              <p className="text-muted">No memberships are active on this date.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}