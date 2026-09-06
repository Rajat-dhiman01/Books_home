import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sun,
  Moon,
  Clock,
  Users,
  Armchair,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import { fetchAvailability, fetchSeats, fetchShifts, type AvailabilityResponse, type Seat, type Shift } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { Meteors } from '@/components/Meteors'
import { HERO_IMAGE_URL, heroBackgroundStyle } from '@/lib/branding'

export default function Dashboard() {
  const [data, setData] = useState<AvailabilityResponse | null>(null)
  const [seats, setSeats] = useState<Seat[] | null>(null)
  const [allShifts, setAllShifts] = useState<Shift[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([fetchAvailability(), fetchSeats(), fetchShifts()])
      .then(([availability, seatRows, shiftRows]) => {
        setData(availability)
        setSeats(seatRows)
        setAllShifts(shiftRows)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const totalSeats = seats?.length ?? 0
  const inactiveCount = seats?.filter((s) => s.status === 'INACTIVE').length ?? 0
  const maintenanceCount = seats?.filter((s) => s.status === 'MAINTENANCE').length ?? 0

  const primaryShift = useMemo(() => {
    if (!data) return null
    if (selectedShiftId) return data.shifts.find((s) => s.shiftId === selectedShiftId) ?? null
    return data.shifts[0] ?? null
  }, [data, selectedShiftId])

  const availableCount = primaryShift ? primaryShift.availableCount : 0
  const reservedCount = primaryShift ? primaryShift.reservedCount : 0
  const occupiedCount = primaryShift ? primaryShift.preferredBlockedCount : 0

  const pct = (count: number) => (totalSeats > 0 ? ((count / totalSeats) * 100).toFixed(1) : '0.0')

  const visibleShiftCards = selectedShiftId
    ? data?.shifts.filter((s) => s.shiftId === selectedShiftId) ?? []
    : data?.shifts ?? []

  function shiftIcon(name: string) {
    return name.toLowerCase().includes('evening') || name.toLowerCase().includes('night') ? Moon : Sun
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface via-background to-background bg-cover bg-center"
        style={heroBackgroundStyle(HERO_IMAGE_URL)}
      >
        <Meteors count={15} />
        <div className="relative mx-auto flex max-w-5xl items-start justify-between gap-6 px-6 py-14">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Study &middot; Focus &middot; Grow
            </div>
            <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
              Bookshome
            </h1>
            <p className="mt-2 text-muted">Seat occupancy, tracked as it happens.</p>
            <div className="mt-5 flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4" />
              {data ? `${data.date} at ${data.time}` : 'Fetching current time'}
            </div>
          </div>

          <div className="hidden shrink-0 items-stretch gap-6 lg:flex">
            <div className="w-px bg-border" />
            <div className="flex items-center text-right text-xs font-medium uppercase tracking-[0.2em] text-muted">
              A quieter you
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {error && (
          <Card className="mb-6 border-danger/30 bg-danger/5">
            <CardContent className="pt-5 text-danger">
              Could not load dashboard data. {error}
              <div className="mt-1 text-sm text-muted">Check that the backend is running.</div>
            </CardContent>
          </Card>
        )}

        {/* Stat cards */}
        {loading && !error && (
          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

        {!loading && !error && seats && (
          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              icon={<Armchair className="h-4 w-4 text-muted" />}
              label="Total seats"
              value={totalSeats}
              sub="Across all cabins"
              delay={0}
            />
            <StatCard
              dotClassName="bg-accent"
              label="Available"
              value={availableCount}
              sub={`${pct(availableCount)}% free`}
              delay={40}
            />
            <StatCard
              dotClassName="bg-primary"
              label="Reserved"
              value={reservedCount}
              sub={`${pct(reservedCount)}% of total`}
              delay={80}
            />
            <StatCard
              dotClassName="bg-danger"
              label="Occupied"
              value={occupiedCount}
              sub={`${pct(occupiedCount)}% of total`}
              delay={120}
            />
            <StatCard
              dotClassName="bg-muted"
              label="Inactive"
              value={inactiveCount}
              sub={`${pct(inactiveCount)}% of total`}
              delay={160}
            />
            <StatCard
              ringClassName="border-2 border-amber-400"
              label="Maintenance"
              value={maintenanceCount}
              sub={`${pct(maintenanceCount)}% of total`}
              delay={200}
            />
          </div>
        )}

        {/* Today's overview */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-medium text-foreground">Today's overview</h2>
            <p className="text-sm text-muted">Live seat status by shift.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {allShifts && allShifts.length > 0 && (
              <div className="flex min-w-0 gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
                {allShifts.map((shift) => (
                  <button
                    key={shift.id}
                    onClick={() => setSelectedShiftId((prev) => (prev === shift.id ? null : shift.id))}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedShiftId === shift.id
                        ? 'bg-primary text-white'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {shift.name}
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

        {loading && !data && !error && (
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <Card key={i}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                  <div className="mt-5 space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data && (
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visibleShiftCards.map((shift, i) => {
              const Icon = shiftIcon(shift.shiftName)
              const fillPct = shift.totalActiveSeats > 0 ? (shift.availableCount / shift.totalActiveSeats) * 100 : 0
              return (
                <Card key={shift.shiftId} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <CardHeader className="flex-col items-start gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <CardTitle>{shift.shiftName}</CardTitle>
                    </div>
                    <Link
                      to="/seats"
                      className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {shift.availableCount} of {shift.totalActiveSeats} available
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>

                    <div className="mt-5 space-y-2.5 border-t border-border pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Armchair className="h-3.5 w-3.5" />
                          Reserved
                        </span>
                        <span className="text-foreground">{shift.reservedCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Users className="h-3.5 w-3.5" />
                          Preferred, occupied
                        </span>
                        <span className="text-foreground">{shift.preferredBlockedCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {visibleShiftCards.length === 0 && (
              <p className="text-muted sm:col-span-2">
                {selectedShiftId ? "It's currently outside this shift's hours." : 'No active shift matches the current time.'}
              </p>
            )}
          </div>
        )}

        {/* Recent activity - honestly labeled placeholder, no backend feature yet */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-medium text-foreground">Recent activity</h2>
                <Badge variant="default">Coming soon</Badge>
              </div>
              <p className="text-sm text-muted">Latest updates across the library.</p>
            </div>
          </div>
          <Card className="border-dashed">
            <CardContent className="flex items-center gap-3 py-6 text-muted">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="text-sm">
                An activity feed (check-ins, new reservations, seat status changes) isn't built yet. This section is a
                placeholder until that backend feature exists.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Rishikesh, Uttarakhand</span>
          <span>Better spaces. Deeper focus.</span>
        </div>
      </div>
    </div>
  )
}