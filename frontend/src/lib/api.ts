export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'PREFERRED_OCCUPIED' | 'INACTIVE' | 'MAINTENANCE'

export interface SeatStatusEntry {
  seatId: string
  seatNumber: string
  name: string | null
  floor: string | null
  section: string | null
  status: SeatStatus
}

export interface ShiftAvailability {
  shiftId: string
  shiftName: string
  totalActiveSeats: number
  reservedCount: number
  preferredBlockedCount: number
  availableCount: number
  availableSeatIds: string[]
  seatStatuses: SeatStatusEntry[]
}

export interface AvailabilityResponse {
  date: string
  time: string
  shifts: ShiftAvailability[]
}

export async function fetchAvailability(): Promise<AvailabilityResponse> {
  const res = await fetch('/api/availability')
  if (!res.ok) {
    throw new Error(`Failed to fetch availability (${res.status})`)
  }
  const json = await res.json()
  return json.data
}