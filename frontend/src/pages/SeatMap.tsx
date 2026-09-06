import { useEffect, useMemo, useState, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Armchair, Clock, RefreshCw, Wrench, Ban, Users2, ChevronRight, Eye, X as XIcon } from 'lucide-react'
import {
  fetchAvailability,
  fetchSeatAssignments,
  fetchMemberships,
  fetchMembers,
  fetchMembershipPlans,
  fetchShifts,
  type AvailabilityResponse,
  type SeatStatus,
  type SeatStatusEntry,
  type SeatAssignment,
  type Membership,
  type Member,
  type MembershipPlan,
  type Shift,
  type ShiftAvailability,
} from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<SeatStatus, string> = {
  AVAILABLE: 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
  RESERVED: 'border-primary/40 bg-primary/20 text-primary hover:bg-primary/30',
  PREFERRED_OCCUPIED: 'border-danger/40 bg-danger/20 text-danger hover:bg-danger/30',
  INACTIVE: 'border-border bg-surface text-muted opacity-50',
  MAINTENANCE: 'border-amber-400/40 bg-amber-400/15 text-amber-400 hover:bg-amber-400/25',
}

const STATUS_LABELS: Record<SeatStatus, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  PREFERRED_OCCUPIED: 'Occupied',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
}

const STATUS_DOT: Record<SeatStatus, string> = {
  AVAILABLE: 'bg-accent',
  RESERVED: 'bg-primary',
  PREFERRED_OCCUPIED: 'bg-danger',
  INACTIVE: 'bg-muted',
  MAINTENANCE: 'bg-amber-400',
}

// Row stagger is capped so a large seat grid (e.g. 80 seats) still reveals
// as one coordinated animation, not a multi-second cascading drip.
const ROW_STAGGER_MS = 60
const ROW_STAGGER_MAX_MS = 480

function naturalCompare(a: string, b: string) {
  const an = parseInt(a, 10)
  const bn = parseInt(b, 10)
  if (!isNaN(an) && !isNaN(bn)) return an - bn
  return a.localeCompare(b)
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function useResponsiveColumns() {
  const [cols, setCols] = useState(() => compute())
  function compute() {
    if (typeof window === 'undefined') return 10
    const w = window.innerWidth
    if (w < 640) return 5
    if (w < 1024) return 8
    return 10
  }
  useEffect(() => {
    const onResize = () => setCols(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return cols
}

export default function SeatMap() {
  const [data, setData] = useState<AvailabilityResponse | null>(null)
  const [assignments, setAssignments] = useState<SeatAssignment[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [allShifts, setAllShifts] = useState<Shift[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null)
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null)
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null)

  // Used only when no shift is currently active (e.g. late night) — lets
  // staff explicitly preview what a given shift's seat map would look like,
  // clearly separate from the live status shown during operating hours.
  const [previewShiftId, setPreviewShiftId] = useState<string | null>(null)
  const [previewShift, setPreviewShift] = useState<ShiftAvailability | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const columns = useResponsiveColumns()

  function load() {
    setLoading(true)
    setError(null)
    setPreviewShiftId(null)
    setPreviewShift(null)
    setPreviewError(null)
    Promise.all([
      fetchAvailability(),
      fetchSeatAssignments(),
      fetchMemberships(),
      fetchMembers(),
      fetchMembershipPlans(),
      fetchShifts(),
    ])
      .then(([availability, assignmentRows, membershipRows, memberRows, planRows, shiftRows]) => {
        setData(availability)
        setActiveShiftId((prev) => prev ?? availability.shifts[0]?.shiftId ?? null)
        setAssignments(assignmentRows)
        setMemberships(membershipRows)
        setMembers(memberRows)
        setPlans(planRows)
        setAllShifts(shiftRows)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    if (!previewShiftId) return
    setPreviewLoading(true)
    setPreviewError(null)
    fetchAvailability(previewShiftId)
      .then((res) => setPreviewShift(res.shifts[0] ?? null))
      .catch((err: Error) => setPreviewError(err.message))
      .finally(() => setPreviewLoading(false))
  }, [previewShiftId])

  const noShiftCurrentlyActive = !loading && !error && !!data && data.shifts.length === 0
  const isPreviewing = noShiftCurrentlyActive && !!previewShiftId

  const activeShift = data?.shifts.find((s) => s.shiftId === activeShiftId) ?? data?.shifts[0] ?? (isPreviewing ? previewShift ?? undefined : undefined)

  const floors = useMemo(() => {
    if (!activeShift) return []
    const distinct = Array.from(new Set(activeShift.seatStatuses.map((s) => s.floor).filter((f): f is string => Boolean(f))))
    return distinct.sort()
  }, [activeShift])

  const visibleSeats = useMemo(() => {
    if (!activeShift) return []
    const list = selectedFloor ? activeShift.seatStatuses.filter((s) => s.floor === selectedFloor) : activeShift.seatStatuses
    return [...list].sort((a, b) => naturalCompare(a.seatNumber, b.seatNumber))
  }, [activeShift, selectedFloor])

  const rows = useMemo(() => {
    const chunks: SeatStatusEntry[][] = []
    for (let i = 0; i < visibleSeats.length; i += columns) {
      chunks.push(visibleSeats.slice(i, i + columns))
    }
    return chunks
  }, [visibleSeats, columns])

  const counts = useMemo(() => {
    const base: Record<SeatStatus, number> = {
      AVAILABLE: 0,
      RESERVED: 0,
      PREFERRED_OCCUPIED: 0,
      INACTIVE: 0,
      MAINTENANCE: 0,
    }
    visibleSeats.forEach((s) => {
      base[s.status] += 1
    })
    return base
  }, [visibleSeats])

  const today = data?.date ?? ''

  const selectedSeat = visibleSeats.find((s) => s.seatId === selectedSeatId) ?? null

  const selectedSeatDetail = useMemo(() => {
    if (!selectedSeat) return null
    const assignment = assignments.find(
      (a) => a.seatId === selectedSeat.seatId && today >= a.startDate && today <= a.endDate,
    )
    if (!assignment) return { assignment: null, membership: null, member: null, plan: null }
    const membership = memberships.find((m) => m.id === assignment.membershipId) ?? null
    const member = membership ? members.find((m) => m.id === membership.memberId) ?? null : null
    const plan = membership ? plans.find((p) => p.id === membership.membershipPlanId) ?? null : null
    return { assignment, membership, member, plan }
  }, [selectedSeat, assignments, memberships, members, plans, today])

  const showInitialGridSkeleton = loading && !error && !data

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Seat map</h1>
          <p className="mt-2 text-muted">Live status for every seat in the library.</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Clock className="h-4 w-4" />
            {data ? `${data.date} at ${data.time}` : 'Fetching current time'}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {data && data.shifts.length > 1 && (
              <div className="flex min-w-0 gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
                {data.shifts.map((shift) => (
                  <button
                    key={shift.shiftId}
                    onClick={() => setActiveShiftId(shift.shiftId)}
                    className={cn(
                      'shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors',
                      shift.shiftId === activeShiftId ? 'bg-primary text-white' : 'text-muted hover:text-foreground',
                    )}
                  >
                    {shift.shiftName}
                  </button>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-danger/30 bg-danger/5">
            <CardContent className="pt-5 text-danger">Could not load seat data. {error}</CardContent>
          </Card>
        )}

        {/* No shift currently active — offer a preview instead of a blank page */}
        {noShiftCurrentlyActive && (
          <Card className="mb-6 border-amber-400/30 bg-amber-400/5">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">No shift is currently active.</p>
                  <p className="mt-1 text-sm text-muted">
                    {data ? `It's ${data.time} right now, outside every configured shift's hours.` : ''} Pick a shift below to
                    preview its seat map — this is a preview only, not live status.
                  </p>
                </div>
                {isPreviewing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setPreviewShiftId(null)
                      setPreviewShift(null)
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                    Exit preview
                  </Button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {allShifts
                  .filter((s) => s.isActive)
                  .map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() => setPreviewShiftId(shift.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
                        previewShiftId === shift.id
                          ? 'border-primary/40 bg-primary/20 text-primary'
                          : 'border-border bg-surface text-muted hover:text-foreground',
                      )}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {shift.name}
                      <span className="text-xs opacity-70">
                        {shift.startTime}–{shift.endTime}
                      </span>
                    </button>
                  ))}
              </div>

              {previewError && <p className="mt-3 text-sm text-danger">Could not load preview. {previewError}</p>}
            </CardContent>
          </Card>
        )}

        {/* Stat cards */}
        {loading && !error && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="mt-3 h-7 w-10" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && activeShift && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              icon={<Armchair className="h-4 w-4 text-muted" />}
              label="Total seats"
              value={visibleSeats.length}
              sub="This shift"
              delay={0}
            />
            <StatCard dotClassName="bg-accent" label="Available" value={counts.AVAILABLE} sub="Ready to assign" delay={40} />
            <StatCard dotClassName="bg-primary" label="Reserved" value={counts.RESERVED} sub="Full day holders" delay={80} />
            <StatCard dotClassName="bg-danger" label="Occupied" value={counts.PREFERRED_OCCUPIED} sub="Preferred, present" delay={120} />
            <StatCard dotClassName="bg-muted" label="Inactive" value={counts.INACTIVE} sub="Not in service" delay={160} />
            <StatCard ringClassName="border-2 border-amber-400" label="Maintenance" value={counts.MAINTENANCE} sub="Under repair" delay={200} />
          </div>
        )}

        {/* Floor tabs */}
        {floors.length > 1 && (
          <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
            <button
              onClick={() => setSelectedFloor(null)}
              className={cn(
                'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                selectedFloor === null ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground',
              )}
            >
              All floors
            </button>
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={cn(
                  'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  selectedFloor === floor ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground',
                )}
              >
                {floor}
              </button>
            ))}
          </div>
        )}

        {/* Initial-load skeleton for the grid itself (before we even know column/seat counts) */}
        {showInitialGridSkeleton && (
          <div>
            <div className="mb-6 flex flex-wrap gap-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
            <div className="overflow-x-auto pb-2">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `2rem repeat(${columns}, minmax(2.75rem, 1fr))`,
                  minWidth: `${(columns + 1) * 3}rem`,
                }}
              >
                {Array.from({ length: 4 }, (_, rowIndex) => (
                  <Fragment key={rowIndex}>
                    <div />
                    {Array.from({ length: columns }, (_, colIndex) => (
                      <Skeleton
                        key={`sk-${rowIndex}-${colIndex}`}
                        className="aspect-square w-full rounded-lg"
                        style={{ animationDelay: `${Math.min(rowIndex * ROW_STAGGER_MS, ROW_STAGGER_MAX_MS)}ms` }}
                      />
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {noShiftCurrentlyActive && previewShiftId && previewLoading && (
          <div className="overflow-x-auto pb-2">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `2rem repeat(${columns}, minmax(2.75rem, 1fr))`,
                minWidth: `${(columns + 1) * 3}rem`,
              }}
            >
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <Fragment key={rowIndex}>
                  <div />
                  {Array.from({ length: columns }, (_, colIndex) => (
                    <Skeleton key={`pv-sk-${rowIndex}-${colIndex}`} className="aspect-square w-full rounded-lg" />
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        )}

        {activeShift && (
          <div className={selectedSeat ? 'lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6' : ''}>
            <div>
              {isPreviewing && (
                <div className="mb-4 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <Eye className="h-3.5 w-3.5" />
                  Preview — {activeShift.shiftName}, not live
                </div>
              )}

              {/* Legend */}
              <div className="mb-6 flex flex-wrap gap-4 text-sm">
                {(Object.keys(STATUS_LABELS) as SeatStatus[]).map((status) => (
                  <div key={status} className="flex items-center gap-1.5 text-muted">
                    <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_DOT[status])} />
                    {STATUS_LABELS[status]}
                  </div>
                ))}
              </div>

              {/* Grid */}
              {visibleSeats.length === 0 ? (
                <p className="text-muted">No seats found for this selection.</p>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `2rem repeat(${columns}, minmax(2.75rem, 1fr))`,
                      minWidth: `${(columns + 1) * 3}rem`,
                    }}
                  >
                    <div />
                    {Array.from({ length: columns }, (_, i) => (
                      <div key={`h-${i}`} className="text-center text-xs text-muted">
                        {i + 1}
                      </div>
                    ))}
                    {rows.map((row, rowIndex) => {
                      const rowDelay = Math.min(rowIndex * ROW_STAGGER_MS, ROW_STAGGER_MAX_MS)
                      return (
                        <Fragment key={rowIndex}>
                          <div className="flex items-center justify-center text-xs font-medium text-muted">
                            {String.fromCharCode(65 + rowIndex)}
                          </div>
                          {Array.from({ length: columns }, (_, colIndex) => {
                            const seat = row[colIndex]
                            if (!seat) return <div key={`empty-${rowIndex}-${colIndex}`} />
                            return (
                              <button
                                key={seat.seatId}
                                onClick={() => setSelectedSeatId((prev) => (prev === seat.seatId ? null : seat.seatId))}
                                title={seat.name ?? seat.seatNumber}
                                className={cn(
                                  'animate-fade-in flex aspect-square flex-col items-center justify-center rounded-lg border text-xs font-medium transition-colors',
                                  STATUS_STYLES[seat.status],
                                  selectedSeatId === seat.seatId && 'ring-2 ring-foreground',
                                )}
                                style={{ animationDelay: `${rowDelay}ms` }}
                              >
                                {seat.status === 'MAINTENANCE' ? (
                                  <Wrench className="h-3.5 w-3.5" />
                                ) : seat.status === 'INACTIVE' ? (
                                  <Ban className="h-3.5 w-3.5" />
                                ) : null}
                                <span className={seat.status === 'MAINTENANCE' || seat.status === 'INACTIVE' ? 'mt-0.5' : ''}>
                                  {seat.seatNumber}
                                </span>
                              </button>
                            )
                          })}
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Detail panel */}
            {selectedSeat && (
              <Card className="animate-fade-in mt-6 lg:mt-0">
                <CardContent className="pt-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-medium text-foreground">
                      Seat {selectedSeat.seatNumber}
                    </h2>
                    <Badge
                      variant={
                        selectedSeat.status === 'AVAILABLE'
                          ? 'accent'
                          : selectedSeat.status === 'RESERVED' || selectedSeat.status === 'PREFERRED_OCCUPIED'
                            ? 'default'
                            : 'default'
                      }
                    >
                      {STATUS_LABELS[selectedSeat.status]}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted">Floor</span>
                      <span className="text-right text-foreground">
                        {selectedSeat.floor ?? 'Unassigned'}
                        {selectedSeat.section ? ` (${selectedSeat.section})` : ''}
                      </span>
                    </div>

                    {selectedSeatDetail?.member && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted">Member</span>
                        <span className="text-right text-foreground">
                          {selectedSeatDetail.member.fullName}
                          {selectedSeatDetail.member.phone && (
                            <span className="block text-xs text-muted">{selectedSeatDetail.member.phone}</span>
                          )}
                        </span>
                      </div>
                    )}

                    {selectedSeatDetail?.plan && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted">Membership</span>
                        <span className="text-right text-foreground">{selectedSeatDetail.plan.name}</span>
                      </div>
                    )}

                    {selectedSeatDetail?.membership && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted">Valid till</span>
                        <span className="text-right text-foreground">{formatDate(selectedSeatDetail.membership.endDate)}</span>
                      </div>
                    )}

                    {selectedSeatDetail?.membership && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted">Remarks</span>
                        <span className="text-right text-foreground">{selectedSeatDetail.membership.notes || '\u2014'}</span>
                      </div>
                    )}
                  </div>

                  {selectedSeatDetail?.member && (
                    <Link to="/members" className="mt-5 block">
                      <Button variant="outline" size="md" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Users2 className="h-4 w-4" />
                          View member
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}

                  {!selectedSeatDetail?.member && (
                    <p className="mt-5 text-sm text-muted">
                      {selectedSeat.status === 'AVAILABLE'
                        ? 'This seat is currently free.'
                        : 'No active member is linked to this seat right now.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}