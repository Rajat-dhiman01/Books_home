import { useEffect, useState } from 'react'
import { Sun, Clock, Users, Armchair, RefreshCw } from 'lucide-react'
import { fetchAvailability, type AvailabilityResponse } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Meteors } from '@/components/Meteors'

export default function Dashboard() {
  const [data, setData] = useState<AvailabilityResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    setError(null)
    fetchAvailability()
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden border-b border-border">
        <Meteors count={25} />
        <div className="relative mx-auto max-w-5xl px-6 py-14">
          <Badge variant="accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Live
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-foreground">
            Bookshome
          </h1>
          <p className="mt-2 text-muted">Seat occupancy, tracked as it happens.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Clock className="h-4 w-4" />
            {data ? `${data.date} at ${data.time}` : 'Fetching current time'}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-danger/30 bg-danger/5">
            <CardContent className="pt-5 text-danger">
              Could not load dashboard data. {error}
              <div className="mt-1 text-sm text-muted">Check that the backend is running.</div>
            </CardContent>
          </Card>
        )}

        {loading && !data && (
          <div className="text-muted">Loading occupancy data.</div>
        )}

        {data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.shifts.map((shift) => (
              <Card key={shift.shiftId} className="group">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-primary" />
                    <CardTitle>{shift.shiftName}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-medium text-foreground">
                      {shift.availableCount}
                    </span>
                    <span className="text-sm text-muted">
                      of {shift.totalActiveSeats} available
                    </span>
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
            ))}

            {data.shifts.length === 0 && (
              <p className="text-muted">No active shift matches the current time.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}