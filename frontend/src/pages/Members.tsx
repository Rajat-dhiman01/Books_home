import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Search, Plus, X, Pencil, User } from 'lucide-react'
import { fetchMembers, createMember, updateMember, type Member, type MemberStatus } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

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

export default function Members() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetchMembers()
      .then(setMembers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.memberCode ?? '').toLowerCase().includes(q) ||
        (m.phone ?? '').toLowerCase().includes(q),
    )
  }, [members, query])

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
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
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

                {formError && (
                  <div className="sm:col-span-2 text-sm text-danger">{formError}</div>
                )}

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
            <CardContent className="pt-5 text-danger">
              Could not load members. {error}
            </CardContent>
          </Card>
        )}

        {loading && !error && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 py-4">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-3">
            {filtered.map((member, i) => (
              <Card
                key={member.id}
                className="animate-fade-in cursor-pointer transition-colors hover:bg-surface-hover"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => openEditForm(member)}
              >
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-muted">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{member.fullName}</div>
                      <div className="truncate text-sm text-muted">
                        {[member.memberCode, member.phone].filter(Boolean).join(' · ') || 'No code or phone on file'}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={member.status === 'ACTIVE' ? 'accent' : 'default'}>
                      {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                    <Pencil className="h-4 w-4 text-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && (
              <p className="text-muted">
                {query ? 'No members match your search.' : 'No members yet. Add your first one above.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}