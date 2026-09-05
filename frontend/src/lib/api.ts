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

// --- Shared request helper for everything below ---

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      json?.error && typeof json.error === 'string'
        ? json.error
        : json?.error
          ? JSON.stringify(json.error)
          : `Request failed (${res.status})`
    throw new Error(message)
  }
  return json as T
}

// --- Members ---

export type MemberStatus = 'ACTIVE' | 'INACTIVE'

export interface Member {
  id: string
  libraryId: string
  memberCode: string | null
  fullName: string
  phone: string | null
  email: string | null
  notes: string | null
  status: MemberStatus
  createdAt: string
  updatedAt: string
}

export interface MemberInput {
  memberCode?: string
  fullName: string
  phone?: string
  email?: string
  notes?: string
  status?: MemberStatus
}

export async function fetchMembers(): Promise<Member[]> {
  const json = await apiRequest<{ data: Member[]; count: number }>('/members')
  return json.data
}

export async function createMember(input: MemberInput): Promise<Member> {
  const json = await apiRequest<{ data: Member }>('/members', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return json.data
}

export async function updateMember(id: string, input: Partial<MemberInput>): Promise<Member> {
  const json = await apiRequest<{ data: Member }>(`/members/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return json.data
}

// --- Shifts ---

export interface Shift {
  id: string
  libraryId: string
  name: string
  startTime: string
  endTime: string
  crossesMidnight: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ShiftInput {
  name: string
  startTime: string
  endTime: string
  crossesMidnight?: boolean
  isActive?: boolean
}

export async function fetchShifts(): Promise<Shift[]> {
  const json = await apiRequest<{ data: Shift[]; count: number }>('/shifts')
  return json.data
}

export async function createShift(input: ShiftInput): Promise<Shift> {
  const json = await apiRequest<{ data: Shift }>('/shifts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return json.data
}

export async function updateShift(id: string, input: Partial<ShiftInput>): Promise<Shift> {
  const json = await apiRequest<{ data: Shift }>(`/shifts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return json.data
}

export async function deleteShift(id: string): Promise<void> {
  await apiRequest<{ data: Shift }>(`/shifts/${id}`, { method: 'DELETE' })
}

// --- Membership plans ---

export interface MembershipPlan {
  id: string
  libraryId: string
  name: string
  shiftId: string
  seatReservationType: 'REQUIRED' | 'OPTIONAL' | 'NONE'
  isActive: boolean
  description: string | null
}

export interface MembershipPlanInput {
  name: string
  shiftId: string
  seatReservationType: 'REQUIRED' | 'OPTIONAL' | 'NONE'
  isActive?: boolean
  description?: string
}

export async function fetchMembershipPlans(): Promise<MembershipPlan[]> {
  const json = await apiRequest<{ data: MembershipPlan[]; count: number }>('/membership_plans')
  return json.data
}

export async function createMembershipPlan(input: MembershipPlanInput): Promise<MembershipPlan> {
  const json = await apiRequest<{ data: MembershipPlan }>('/membership_plans', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return json.data
}

export async function updateMembershipPlan(
  id: string,
  input: Partial<MembershipPlanInput>,
): Promise<MembershipPlan> {
  const json = await apiRequest<{ data: MembershipPlan }>(`/membership_plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return json.data
}

export async function deleteMembershipPlan(id: string): Promise<void> {
  await apiRequest<{ data: MembershipPlan }>(`/membership_plans/${id}`, { method: 'DELETE' })
}

// --- Seats ---

export type SeatRowStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface Seat {
  id: string
  libraryId: string
  seatNumber: string
  name: string | null
  floor: string | null
  section: string | null
  status: SeatRowStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface SeatInput {
  seatNumber: string
  name?: string
  floor?: string
  section?: string
  status?: SeatRowStatus
  notes?: string
}

export async function fetchSeats(): Promise<Seat[]> {
  const json = await apiRequest<{ data: Seat[]; count: number }>('/seats')
  return json.data
}

export async function createSeat(input: SeatInput): Promise<Seat> {
  const json = await apiRequest<{ data: Seat }>('/seats', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return json.data
}

export async function updateSeat(id: string, input: Partial<SeatInput>): Promise<Seat> {
  const json = await apiRequest<{ data: Seat }>(`/seats/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return json.data
}

export async function deleteSeat(id: string): Promise<void> {
  await apiRequest<{ data: Seat }>(`/seats/${id}`, { method: 'DELETE' })
}

// --- Memberships (read-only here, needed to find "active on date X") ---

export type MembershipStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface Membership {
  id: string
  memberId: string
  membershipPlanId: string
  startDate: string
  endDate: string
  status: MembershipStatus
  notes: string | null
}

export async function fetchMemberships(): Promise<Membership[]> {
  const json = await apiRequest<{ data: Membership[]; count: number }>('/memberships')
  return json.data
}

// --- Attendance ---

export type AttendanceStatus = 'PRESENT' | 'ABSENT'

export interface AttendanceRecord {
  id: string
  membershipId: string
  attendanceDate: string
  status: AttendanceStatus
  checkInAt: string | null
  checkOutAt: string | null
  notes: string | null
}

export async function fetchAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
  const json = await apiRequest<{ data: AttendanceRecord[]; count: number }>(
    `/attendance?date=${encodeURIComponent(date)}`
  )
  return json.data
}

export async function createAttendance(input: {
  membershipId: string
  attendanceDate: string
  status: AttendanceStatus
}): Promise<AttendanceRecord> {
  const json = await apiRequest<{ data: AttendanceRecord }>('/attendance', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return json.data
}

export async function updateAttendance(
  id: string,
  input: Partial<{ status: AttendanceStatus }>
): Promise<AttendanceRecord> {
  const json = await apiRequest<{ data: AttendanceRecord }>(`/attendance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return json.data
}