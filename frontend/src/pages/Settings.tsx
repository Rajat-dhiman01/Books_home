import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, X, Pencil, Trash2, Clock, IdCard, Armchair } from 'lucide-react'
import {
  fetchShifts,
  createShift,
  updateShift,
  deleteShift,
  type Shift,
  type ShiftInput,
  fetchMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  type MembershipPlan,
  type MembershipPlanInput,
  fetchSeats,
  createSeat,
  updateSeat,
  deleteSeat,
  type Seat,
  type SeatInput,
  type SeatRowStatus,
} from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, i) => (
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
  )
}

type Tab = 'shifts' | 'plans' | 'seats'

export default function Settings() {
  const [tab, setTab] = useState<Tab>('shifts')

  const tabs: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: 'shifts', label: 'Shifts', icon: Clock },
    { id: 'plans', label: 'Membership plans', icon: IdCard },
    { id: 'seats', label: 'Seats', icon: Armchair },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Settings</h1>
          <p className="mt-2 text-muted">Shifts, membership plans, and seats. Configuration, not code.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'shifts' && <ShiftsSection />}
        {tab === 'plans' && <PlansSection />}
        {tab === 'seats' && <SeatsSection />}
      </div>
    </div>
  )
}

// ============================================================
// Shifts
// ============================================================

interface ShiftFormState {
  name: string
  startTime: string
  endTime: string
  crossesMidnight: boolean
  isActive: boolean
}

const emptyShiftForm: ShiftFormState = {
  name: '',
  startTime: '',
  endTime: '',
  crossesMidnight: false,
  isActive: true,
}

function ShiftsSection() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ShiftFormState>(emptyShiftForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetchShifts()
      .then(setShifts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function openAddForm() {
    setEditingId(null)
    setForm(emptyShiftForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(shift: Shift) {
    setEditingId(shift.id)
    setForm({
      name: shift.name,
      startTime: shift.startTime.slice(0, 5),
      endTime: shift.endTime.slice(0, 5),
      crossesMidnight: shift.crossesMidnight,
      isActive: shift.isActive,
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
    if (!form.name.trim() || !form.startTime || !form.endTime) {
      setFormError('Name, start time, and end time are all required.')
      return
    }

    const payload: ShiftInput = {
      name: form.name.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      crossesMidnight: form.crossesMidnight,
      isActive: form.isActive,
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        const updated = await updateShift(editingId, payload)
        setShifts((prev) => prev.map((s) => (s.id === editingId ? updated : s)))
      } else {
        const created = await createShift(payload)
        setShifts((prev) => [created, ...prev])
      }
      closeForm()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(shift: Shift) {
    if (!confirm(`Delete the "${shift.name}" shift? This can't be undone.`)) return
    try {
      await deleteShift(shift.id)
      setShifts((prev) => prev.filter((s) => s.id !== shift.id))
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button variant="primary" size="md" onClick={openAddForm}>
          <Plus className="h-4 w-4" />
          Add shift
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-medium text-foreground">
                {editingId ? 'Edit shift' : 'New shift'}
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
                <Label htmlFor="shiftName">Name *</Label>
                <Input
                  id="shiftName"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Morning"
                  required
                />
              </div>

              <div>
                <Label htmlFor="startTime">Start time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endTime">End time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="crossesMidnight">Crosses midnight</Label>
                <Select
                  id="crossesMidnight"
                  value={form.crossesMidnight ? 'yes' : 'no'}
                  onChange={(e) => setForm((f) => ({ ...f, crossesMidnight: e.target.value === 'yes' }))}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="shiftActive">Status</Label>
                <Select
                  id="shiftActive"
                  value={form.isActive ? 'yes' : 'no'}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'yes' }))}
                >
                  <option value="yes">Active</option>
                  <option value="no">Inactive</option>
                </Select>
              </div>

              {formError && <div className="sm:col-span-2 text-sm text-danger">{formError}</div>}

              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add shift'}
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
          <CardContent className="pt-5 text-danger">Could not load shifts. {error}</CardContent>
        </Card>
      )}

      {loading && !error && <SectionSkeleton />}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {shifts.map((shift, i) => (
            <Card key={shift.id} className="animate-fade-in cursor-pointer transition-colors hover:bg-surface-hover" style={{ animationDelay: `${i * 40}ms` }} onClick={() => openEditForm(shift)}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-muted">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{shift.name}</div>
                    <div className="truncate text-sm text-muted">
                      {shift.startTime.slice(0, 5)} to {shift.endTime.slice(0, 5)}
                      {shift.crossesMidnight ? ' (crosses midnight)' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={shift.isActive ? 'accent' : 'default'}>{shift.isActive ? 'Active' : 'Inactive'}</Badge>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(shift)
                    }}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="Delete shift"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Pencil className="h-4 w-4 text-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
          {shifts.length === 0 && <p className="text-muted">No shifts yet. Add your first one above.</p>}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Membership plans
// ============================================================

interface PlanFormState {
  name: string
  shiftId: string
  seatReservationType: 'REQUIRED' | 'OPTIONAL' | 'NONE'
  isActive: boolean
  description: string
}

const emptyPlanForm: PlanFormState = {
  name: '',
  shiftId: '',
  seatReservationType: 'OPTIONAL',
  isActive: true,
  description: '',
}

function PlansSection() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PlanFormState>(emptyPlanForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([fetchMembershipPlans(), fetchShifts()])
      .then(([p, s]) => {
        setPlans(p)
        setShifts(s)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const shiftNameById = useMemo(() => {
    const map = new Map<string, string>()
    shifts.forEach((s) => map.set(s.id, s.name))
    return map
  }, [shifts])

  function openAddForm() {
    setEditingId(null)
    setForm({ ...emptyPlanForm, shiftId: shifts[0]?.id ?? '' })
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(plan: MembershipPlan) {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      shiftId: plan.shiftId,
      seatReservationType: plan.seatReservationType,
      isActive: plan.isActive,
      description: plan.description ?? '',
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
    if (!form.name.trim() || !form.shiftId) {
      setFormError('Name and shift are both required.')
      return
    }

    const payload: MembershipPlanInput = {
      name: form.name.trim(),
      shiftId: form.shiftId,
      seatReservationType: form.seatReservationType,
      isActive: form.isActive,
      description: form.description.trim() || undefined,
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        const updated = await updateMembershipPlan(editingId, payload)
        setPlans((prev) => prev.map((p) => (p.id === editingId ? updated : p)))
      } else {
        const created = await createMembershipPlan(payload)
        setPlans((prev) => [created, ...prev])
      }
      closeForm()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(plan: MembershipPlan) {
    if (!confirm(`Delete the "${plan.name}" plan? This can't be undone.`)) return
    try {
      await deleteMembershipPlan(plan.id)
      setPlans((prev) => prev.filter((p) => p.id !== plan.id))
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button variant="primary" size="md" onClick={openAddForm} disabled={shifts.length === 0}>
          <Plus className="h-4 w-4" />
          Add plan
        </Button>
      </div>

      {shifts.length === 0 && !loading && !error && (
        <p className="mb-6 text-sm text-muted">Add a shift first, plans need one to attach to.</p>
      )}

      {formOpen && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-medium text-foreground">
                {editingId ? 'Edit plan' : 'New plan'}
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
                <Label htmlFor="planName">Name *</Label>
                <Input
                  id="planName"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Full Day"
                  required
                />
              </div>

              <div>
                <Label htmlFor="planShift">Shift *</Label>
                <Select
                  id="planShift"
                  value={form.shiftId}
                  onChange={(e) => setForm((f) => ({ ...f, shiftId: e.target.value }))}
                  required
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="planReservation">Seat reservation</Label>
                <Select
                  id="planReservation"
                  value={form.seatReservationType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, seatReservationType: e.target.value as PlanFormState['seatReservationType'] }))
                  }
                >
                  <option value="REQUIRED">Required (reserved seat)</option>
                  <option value="OPTIONAL">Optional (preferred seat)</option>
                  <option value="NONE">None</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="planActive">Status</Label>
                <Select
                  id="planActive"
                  value={form.isActive ? 'yes' : 'no'}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'yes' }))}
                >
                  <option value="yes">Active</option>
                  <option value="no">Inactive</option>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="planDescription">Description</Label>
                <Textarea
                  id="planDescription"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              {formError && <div className="sm:col-span-2 text-sm text-danger">{formError}</div>}

              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add plan'}
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
          <CardContent className="pt-5 text-danger">Could not load plans. {error}</CardContent>
        </Card>
      )}

      {loading && !error && <SectionSkeleton />}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {plans.map((plan, i) => (
            <Card key={plan.id} className="animate-fade-in cursor-pointer transition-colors hover:bg-surface-hover" style={{ animationDelay: `${i * 40}ms` }} onClick={() => openEditForm(plan)}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-muted">
                    <IdCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{plan.name}</div>
                    <div className="truncate text-sm text-muted">
                      {shiftNameById.get(plan.shiftId) ?? 'Unknown shift'} Â· {plan.seatReservationType.toLowerCase()}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={plan.isActive ? 'accent' : 'default'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(plan)
                    }}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="Delete plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Pencil className="h-4 w-4 text-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && <p className="text-muted">No plans yet. Add your first one above.</p>}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Seats
// ============================================================

interface SeatFormState {
  seatNumber: string
  name: string
  floor: string
  section: string
  status: SeatRowStatus
  notes: string
}

const emptySeatForm: SeatFormState = {
  seatNumber: '',
  name: '',
  floor: '',
  section: '',
  status: 'ACTIVE',
  notes: '',
}

function SeatsSection() {
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SeatFormState>(emptySeatForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetchSeats()
      .then(setSeats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function openAddForm() {
    setEditingId(null)
    setForm(emptySeatForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(seat: Seat) {
    setEditingId(seat.id)
    setForm({
      seatNumber: seat.seatNumber,
      name: seat.name ?? '',
      floor: seat.floor ?? '',
      section: seat.section ?? '',
      status: seat.status,
      notes: seat.notes ?? '',
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
    if (!form.seatNumber.trim()) {
      setFormError('Seat number is required.')
      return
    }

    const payload: SeatInput = {
      seatNumber: form.seatNumber.trim(),
      name: form.name.trim() || undefined,
      floor: form.floor.trim() || undefined,
      section: form.section.trim() || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        const updated = await updateSeat(editingId, payload)
        setSeats((prev) => prev.map((s) => (s.id === editingId ? updated : s)))
      } else {
        const created = await createSeat(payload)
        setSeats((prev) => [created, ...prev])
      }
      closeForm()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(seat: Seat) {
    if (!confirm(`Delete seat "${seat.seatNumber}"? This can't be undone.`)) return
    try {
      await deleteSeat(seat.id)
      setSeats((prev) => prev.filter((s) => s.id !== seat.id))
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const statusVariant = (status: SeatRowStatus) =>
    status === 'ACTIVE' ? 'accent' : status === 'MAINTENANCE' ? 'danger' : 'default'

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button variant="primary" size="md" onClick={openAddForm}>
          <Plus className="h-4 w-4" />
          Add seat
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-medium text-foreground">
                {editingId ? 'Edit seat' : 'New seat'}
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
              <div>
                <Label htmlFor="seatNumber">Seat number *</Label>
                <Input
                  id="seatNumber"
                  value={form.seatNumber}
                  onChange={(e) => setForm((f) => ({ ...f, seatNumber: e.target.value }))}
                  placeholder="e.g. 01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="seatStatus">Status</Label>
                <Select
                  id="seatStatus"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SeatRowStatus }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="seatName">Display name</Label>
                <Input
                  id="seatName"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="seatFloor">Floor</Label>
                <Input
                  id="seatFloor"
                  value={form.floor}
                  onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="seatSection">Section</Label>
                <Input
                  id="seatSection"
                  value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="seatNotes">Notes</Label>
                <Textarea
                  id="seatNotes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              {formError && <div className="sm:col-span-2 text-sm text-danger">{formError}</div>}

              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add seat'}
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
          <CardContent className="pt-5 text-danger">Could not load seats. {error}</CardContent>
        </Card>
      )}

      {loading && !error && <SectionSkeleton />}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {seats.map((seat, i) => (
            <Card key={seat.id} className="animate-fade-in cursor-pointer transition-colors hover:bg-surface-hover" style={{ animationDelay: `${i * 40}ms` }} onClick={() => openEditForm(seat)}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-muted">
                    <Armchair className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      Seat {seat.seatNumber}
                      {seat.name ? ` Â· ${seat.name}` : ''}
                    </div>
                    <div className="truncate text-sm text-muted">
                      {[seat.floor, seat.section].filter(Boolean).join(' Â· ') || 'No floor or section on file'}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={statusVariant(seat.status)}>
                    {seat.status.charAt(0) + seat.status.slice(1).toLowerCase()}
                  </Badge>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(seat)
                    }}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="Delete seat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Pencil className="h-4 w-4 text-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
          {seats.length === 0 && <p className="text-muted">No seats yet. Add your first one above.</p>}
        </div>
      )}
    </div>
  )
}