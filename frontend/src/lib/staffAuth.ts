import { supabase } from './supabaseClient'

export interface StaffProfile {
  id: string
  libraryId: string
  authUserId: string
  email: string
  fullName: string
  role: 'OWNER' | 'ADMIN'
  createdAt: string
  updatedAt: string
}

export async function signInStaff(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

export async function signOutStaff(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function getStaffAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  return data.session?.access_token ?? null
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

// Confirms the current Supabase session belongs to a real staff_users row
// (not, say, a leftover member-portal session) and fetches that profile.
export async function fetchStaffMe(): Promise<StaffProfile> {
  const token = await getStaffAccessToken()
  if (!token) throw new Error('Not signed in.')

  const res = await fetch(`${API_BASE_URL}/staff/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error ?? `Request failed (${res.status})`)
  }
  return json.data as StaffProfile
}