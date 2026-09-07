import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Search, Plus, X, Pencil } from 'lucide-react'
import {
  fetchMembers,
  createMember,
  updateMember,
  fetchMemberships,
  fetchMembershipPlans,
  fetchShifts,
  fetchSeatAssignments,
  fetchSeats,
  type Member,
  type MemberStatus,
  type Membership,
  type MembershipPlan,
  type Shift,
  type SeatAssignment,
  type Seat,
} from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface FormState {
  memberCode: string
  fullName: string
  phone: string
  email: string
  notes: string
  status: MemberStatus
}

const emptyForm: FormState = {
  memberCode: '',
  fullName: '',
  phone: '',
  email: '',
  notes: '',
  status: 'ACTIVE',
}

type VisualStatus = 'active' | 'expiring' | 'inactive' | 'none'

const STATUS_META: Record<VisualStatus, { label: string; dot: string; badgeVariant: 'accent' | 'default' | 'danger' }> = {
  active: { label: 'Active', dot: 'bg-accent', badgeVariant: 'accent' },
  expiring: { label: 'Expiring soon', dot: 'bg-amber-400', badgeVariant: 'default' },
  inactive: { label: 'Inactive', dot: 'bg-muted', badgeVariant: 'default' },
  none: { label: 'No membership', dot: 'bg-muted/50', badgeVariant: 'default' },
}

const EXPIRING_SOON_DAYS = 7

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

function daysUntil(dateStr: string, today: string) {
  const [y1, m1, d1] = today.split('-').map(Number)
  const [y2, m2, d2] = dateStr.split('-').map(Number)
  const ms = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignment[]>([])
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | VisualStatus>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([fetchMembers(), fetchMemberships(), fetchMembershipPlans(), fetchShifts(), fetchSeatAssignments(), fetchSeats()])
      .then(([m, ms, p, s, sa, seatRows]) => {
        setMembers(m)
        setMemberships(ms)
        setPlans(p)
        setShifts(s)
        setSeatAssignments(sa)
        setSeats(seatRows)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const today = todayIso()
  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans])
  const shiftById = useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts])
  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats])

  // Each member's currently-active membership (if any), plus derived plan/
  // shift/seat, computed once so every row lookup below is O(1).
  const enrichedByMemberId = useMemo(() => {
    const map = new Map<
      string,
      { membership: Membership; plan?: MembershipPlan; shift?: Shift; seatNumber?: string; visualStatus: VisualStatus }
    >()
    for (const membership of memberships) {
      if (membership.status === 'CANCELLED') continue
      if (today < membership.startDate || today > membership.endDate) continue

      const plan = planById.get(membership.membershipPlanId)
      const shift = plan ? shiftById.get(plan.shiftId) : undefined
      const assignment = seatAssignments.find(
        (sa) => sa.membershipId === membership.id && today >= sa.startDate && today <= sa.endDate,
      )
      const seatNumber = assignment ? seatById.get(assignment.seatId)?.seatNumber : undefined

      const daysLeft = daysUntil(membership.endDate, today)
      const visualStatus: VisualStatus = daysLeft <= EXPIRING_SOON_DAYS ? 'expiring' : 'active'

      map.set(membership.memberId, { membership, plan, shift, seatNumber, visualStatus })
    }
    return map
  }, [memberships, planById, shiftById, seatAssignments, seatById, today])

  function visualStatusFor(member: Member): VisualStatus {
    if (member.status === 'INACTIVE') return 'inactive'
    const enriched = enrichedByMemberId.get(member.id)
    return enriched ? enriched.visualStatus : 'none'
  }

  const counts = useMemo(() => {
    const base: Record<VisualStatus, number> = { active: 0, expiring: 0, inactive: 0, none: 0 }
    members.forEach((m) => {
      base[visualStatusFor(m)] += 1
    })
    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, enrichedByMemberId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (statusFilter !== 'all' && visualStatusFor(m) !== statusFilter) return false
      if (!q) return true
      return (
        m.fullName.toLowerCase().includes(q) ||
        (m.memberCode ?? '').toLowerCase().includes(q) ||
        (m.phone ?? '').toLowerCase().includes(q)
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, query, statusFilter, enrichedByMemberId])

  function openAddForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(member: Member) {
    setEditingId(member.id)
    setForm({
      memberCode: member.memberCode ?? '',
      fullName: member.fullName,
      phone: member.phone ?? '',
      email: member.email ?? '',
      notes: member.notes ?? '',
      status: member.status,
    })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setFormError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.fullName.trim()) {
      setFormError('Full name is required.')
      return
    }

    const payload = {
      fullName: form.fullName.trim(),
      memberCode: form.memberCode.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: form.status,
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        const updated = await updateMember(editingId, payload)
        setMembers((prev) => prev.map((m) => (m.id === editingId ? updated : m)))
      } else {
        const created = await createMember(payload)
        setMembers((prev) => [created, ...prev])
      }
      closeForm()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Members</h1>
          <p className="mt-2 text-muted">Everyone who's ever held a membership here.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code, or phone"
              className="pl-9"
            />
          </div>
          <Button variant="primary" size="md" onClick={openAddForm}>
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        </div>

        {/* Status filter chips — color-coded, doubling as an at-a-glance
            summary so staff don't need a wide table of columns to see
            where things stand. */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
              statusFilter === 'all'
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border bg-surface text-muted hover:text-foreground',
            )}
          >
            All
            <span className="text-xs opacity-70">{members.length}</span>
          </button>
          {(Object.keys(STATUS_META) as VisualStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                statusFilter === status
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border bg-surface text-muted hover:text-foreground',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', STATUS_META[status].dot)} />
              {STATUS_META[status].label}
              <span className="text-xs opacity-70">{counts[status]}</span>
            </button>
          ))}
        </div>

        {formOpen && (
          <Card className="mb-6">
            <CardContent className="pt-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-medium text-foreground">
                  {editingId ? 'Edit member' : 'New member'}
                </h2>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  aria-label="Close form"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="fullName">Full name *</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="e.g. Priya Verma"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="memberCode">Member code</Label>
                  <Input
                    id="memberCode"
                    value={form.memberCode}
                    onChange={(e) => setForm((f) => ({ ...f, memberCode: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MemberStatus }))}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                {formError && <div className="sm:col-span-2 text-sm text-danger">{formError}</div>}

                <div className="flex gap-3 sm:col-span-2">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add member'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-danger/30 bg-danger/5">
            <CardContent className="pt-5 text-danger">Could not load members. {error}</CardContent>
          </Card>
        )}

        {loading && !error && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 py-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-2">
            {filtered.map((member, i) => {
              const status = visualStatusFor(member)
              const meta = STATUS_META[status]
              const enriched = enrichedByMemberId.get(member.id)

              return (
                <Card
                  key={member.id}
                  className="animate-fade-in cursor-pointer transition-colors hover:bg-surface-hover"
                  style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
                  onClick={() => openEditForm(member)}
                >
                  <CardContent className="flex items-center justify-between gap-3 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-hover text-sm font-medium text-foreground">
                        {member.fullName.charAt(0).toUpperCase()}
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface',
                            meta.dot,
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{member.fullName}</div>
                        <div className="truncate text-sm text-muted">
                          {enriched
                            ? [
                                enriched.plan?.name,
                                enriched.seatNumber ? `Seat ${enriched.seatNumber}` : null,
                                `till ${formatDate(enriched.membership.endDate)}`,
                              ]
                                .filter(Boolean)
                                .join(' · ')
                            : [member.memberCode, member.phone].filter(Boolean).join(' · ') || 'No active membership'}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                      <Pencil className="h-4 w-4 text-muted" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {filtered.length === 0 && (
              <p className="text-muted">
                {query || statusFilter !== 'all' ? 'No members match this view.' : 'No members yet. Add your first one above.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}