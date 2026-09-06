import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'

// Supabase's client library automatically detects and processes the magic
// link tokens present in the URL (hash fragment) on load — this page just
// needs to wait for that to finish, then move on to the dashboard.
export default function MemberCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    const urlError = params.get('error_description') || params.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError.replace(/\+/g, ' ')))
      return
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/member/dashboard', { replace: true })
      }
    })

    // Cover the case where a session already existed by the time this
    // component mounted (e.g. Supabase finished processing the URL before
    // the listener above was attached).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/member/dashboard', { replace: true })
      }
    })

    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          setError('This login link is invalid or has expired. Please request a new one.')
        }
      })
    }, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            {error ? (
              <>
                <AlertCircle className="h-10 w-10 text-danger" />
                <CardTitle className="text-base">Sign-in failed</CardTitle>
                <CardDescription>{error}</CardDescription>
                <Button type="button" size="sm" className="mt-2" onClick={() => navigate('/member/login', { replace: true })}>
                  Back to login
                </Button>
              </>
            ) : (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                <CardTitle className="text-base">Signing you in…</CardTitle>
                <CardDescription>This should only take a moment.</CardDescription>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}