import { useState, type FormEvent } from 'react'
import { Mail, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { sendMemberLoginLink } from '@/lib/memberApi'

export default function MemberLogin() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      await sendMemberLoginLink(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send login link. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 text-center">
          <div className="font-display text-xl font-medium text-foreground">Bookshome</div>
          <div className="mt-0.5 text-xs font-medium uppercase tracking-[0.2em] text-muted">Member Portal</div>
        </div>

        <Card>
          {sent ? (
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-accent" />
              <CardTitle className="text-base">Check your email</CardTitle>
              <CardDescription>
                We sent a login link to <span className="text-foreground">{email.trim()}</span>. Open it on this
                device to sign in.
              </CardDescription>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSent(false)
                  setError(null)
                }}
              >
                Use a different email
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>Enter the email address registered with the library to get a login link.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="member-email">Email address</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <Input
                        id="member-email"
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

                  {error && <p className="text-sm text-danger">{error}</p>}

                  <Button type="submit" disabled={sending || !email.trim()} className="w-full">
                    {sending ? 'Sending link…' : 'Send login link'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          Not registered yet? Ask library staff to add you as a member.
        </p>
      </div>
    </div>
  )
}