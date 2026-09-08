import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { signInStaff, signOutStaff, fetchStaffMe } from '@/lib/staffAuth'

export default function StaffLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signInStaff(email.trim(), password)
      // A valid Supabase login isn't enough on its own — confirm it's
      // actually linked to a staff_users row before letting them in. If a
      // member's email happens to also try this form, this is what stops
      // them (and cleans up the session it just created).
      await fetchStaffMe()
      navigate('/', { replace: true })
    } catch (err) {
      await signOutStaff().catch(() => {})
      setError(err instanceof Error ? err.message : 'Could not sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 text-center">
          <div className="font-display text-xl font-medium text-foreground">Bookshome</div>
          <div className="mt-0.5 text-xs font-medium uppercase tracking-[0.2em] text-muted">Staff Login</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your staff email and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="staff-email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="staff-email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="staff-password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="staff-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={submitting} className="mt-1">
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}