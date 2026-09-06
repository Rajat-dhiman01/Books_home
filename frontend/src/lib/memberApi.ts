import { supabase } from './supabaseClient'
import type { Member, MembershipPlan, Shift, AttendanceRecord, MembershipStatus } from './api'

// --- Auth (Supabase directly — this is the ONLY thing the frontend talks to
// Supabase for; every piece of actual business data/logic goes through our
// own Express backend below, never straight to the database). ---

export async function sendMemberLoginLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/member/callback`,
    },
  })
  if (error) throw new Error(error.message)
}

export async function getMemberAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  return data.session?.access_token ?? null
}

export async function signOutMember(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

// --- Business data — always through the Express backend, authenticated with
// the member's Supabase access token as a Bearer header. The backend (not
// this code) resolves which membership/attendance rows belong to this
// member; we never send a membershipId or similar identity-bearing field
// from the frontend. ---

async function memberApiRequest<T>(path: string, accessToken: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/member${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options?.headers ?? {}),
    },
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

export interface MemberSeatInfo {
  seatNumber: string
  assignmentType: 'RESERVED' | 'PREFERRED'
}

export interface MemberMembershipInfo {
  id: string
  memberId: string
  membershipPlanId: string
  startDate: string
  endDate: string
  status: MembershipStatus
  notes: string | null
}

export interface MemberMeResponse {
  member: Member
  membership: MemberMembershipInfo | null
  plan?: MembershipPlan
  shift?: Shift
  seat: MemberSeatInfo | null
  todayAttendance: AttendanceRecord | null
}

export async function fetchMemberMe(accessToken: string): Promise<MemberMeResponse> {
  const json = await memberApiRequest<{ data: MemberMeResponse }>('/me', accessToken)
  return json.data
}

export async function memberCheckIn(accessToken: string): Promise<AttendanceRecord> {
  const json = await memberApiRequest<{ data: AttendanceRecord }>('/attendance/check-in', accessToken, {
    method: 'POST',
  })
  return json.data
}

export async function memberCheckOut(accessToken: string): Promise<AttendanceRecord> {
  const json = await memberApiRequest<{ data: AttendanceRecord }>('/attendance/check-out', accessToken, {
    method: 'PATCH',
  })
  return json.data
}