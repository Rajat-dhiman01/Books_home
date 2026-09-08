import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2, X, UserCog } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useStaffProfile } from '@/components/RequireStaffAuth'
import { getStaffAccessToken } from '@/lib/staffAuth'

interface StaffRow {
  id: string
  email: string
  fullName: string
  role: 'OWNER' | 'ADMIN'
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

async function staffApiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getStaffAccessToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`)
  return json as T
}

export default function StaffAccounts() {
  const me = useStaffProfile()
  const [staff, setStaff] = useState<StaffRow[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const json = await staffApiRequest<{ data: StaffRow[] }>('/staff')
    setStaff(json.data)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load staff accounts.'))
  }, [])

  async function handleRemove(id: string) {
    if (!confirm('Remove this staff account? They will no longer be able to log in.')) return
    try {
      await staffApiRequest(`/staff/${id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this account.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-medium text-foreground">Staff accounts</h1>
          <p className="mt-0.5 text-sm text-muted">Who can log in to the admin dashboard.</p>
        </div>
        {me.role === 'OWNER' && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Add admin'}
          </Button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {showForm && <AddStaffForm onCreated={() => { setShowForm(false); load() }} onError={setError} />}

      {staff === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }, (_, i) => (
            <Card key={i}><CardContent className="flex items-center gap-3 py-4"><Skeleton className="h-9 w-9 shrink-0 rounded-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {staff.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-3 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-sm font-medium text-foreground">
                  <UserCog className="h-4 w-4 text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{s.fullName}</div>
                  <div className="truncate text-xs text-muted">{s.email}</div>
                </div>
                <Badge variant={s.role === 'OWNER' ? 'primary' : 'default'}>{s.role === 'OWNER' ? 'Owner' : 'Admin'}</Badge>
                {me.role === 'OWNER' && s.id !== me.id && (
                  <button
                    type="button"
                    onClick={() => handleRemove(s.id)}
                    className="rounded-lg p-2 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Remove ${s.fullName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function AddStaffForm({ onCreated, onError }: { onCreated: () => void; onError: (msg: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'OWNER'>('ADMIN')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await staffApiRequest('/staff', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password, fullName: fullName.trim(), role }),
      })
      onCreated()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not create this account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="mb-4">
      <CardContent className="py-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="new-staff-name">Full name</Label>
            <Input id="new-staff-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-staff-email">Email</Label>
            <Input id="new-staff-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-staff-password">Password</Label>
            <Input
              id="new-staff-password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-staff-role">Role</Label>
            <Select id="new-staff-role" value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'OWNER')}>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </Select>
          </div>
          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? 'Creating…' : 'Create account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}