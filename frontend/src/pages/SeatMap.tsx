import { useEffect, useState } from 'react'
import { Armchair, Clock, RefreshCw, Wrench, Ban } from 'lucide-react'
import { fetchAvailability, type AvailabilityResponse, type SeatStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<SeatStatus, string> = {
  AVAILABLE: 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
  RESERVED: 'border-primary/40 bg-primary/10 text-primary',
  PREFERRED_OCCUPIED: 'border-danger/40 bg-danger/10 text-danger',
  INACTIVE: 'border-border bg-surface text-muted opacity-50',
  MAINTENANCE: 'border-border bg-surface text-muted opacity-50',
}

const STATUS_LABELS: Record<SeatStatus, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  PREFERRED_OCCUPIED: 'Occupied',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
}

export default function SeatMap() {
  const [data, setData] = useState<AvailabilityResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetchAvailability()
      .then((res) => {
        setData(res)
        setActiveShiftId((prev) => prev ?? res.shifts[0]?.shiftId ?? null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const activeShift = data?.shifts.find((s) => s.shiftId === activeShiftId) ?? data?.shifts[0]

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
            Seat map
          </h1>
          <p className="mt-2 text-muted">Live status for every cabin in the library.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Clock className="h-4 w-4" />
            {data ? `${data.date} at ${data.time}` : 'Fetching current time'}
          </div>

          <div className="flex items-center gap-3">
            {data && data.shifts.length > 1 && (
              <div className="flex rounded-lg border border-border bg-surface p-1">
                {data.shifts.map((shift) => (
                  <button
                    key={shift.shiftId}
                    onClick={() => setActiveShiftId(shift.shiftId)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm transition-colors',
                      shift.shiftId === activeShiftId
                        ? 'bg-primary text-white'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    {shift.shiftName}
                  </button>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-5 text-danger">
            Could not load seat data. {error}
          </div>
        )}

        {loading && !data && <div className="text-muted">Loading seat map.</div>}

        {activeShift && (
          <>
            <div className="mb-6 flex flex-wrap gap-4 text-sm">
              {(Object.keys(STATUS_LABELS) as SeatStatus[]).map((status) => (
                <div key={status} className="flex items-center gap-1.5 text-muted">
                  <span className={cn('h-2.5 w-2.5 rounded-full border', STATUS_STYLES[status])} />
                  {STATUS_LABELS[status]}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
              {activeShift.seatStatuses.map((seat) => (
                <div
                  key={seat.seatId}
                  title={seat.name ?? seat.seatNumber}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center rounded-lg border text-xs font-medium transition-colors',
                    STATUS_STYLES[seat.status],
                  )}
                >
                  {seat.status === 'MAINTENANCE' ? (
                    <Wrench className="h-4 w-4" />
                  ) : seat.status === 'INACTIVE' ? (
                    <Ban className="h-4 w-4" />
                  ) : (
                    <Armchair className="h-4 w-4" />
                  )}
                  <span className="mt-1">{seat.seatNumber}</span>
                </div>
              ))}
            </div>

            {activeShift.seatStatuses.length === 0 && (
              <p className="text-muted">No seats found for this library.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}