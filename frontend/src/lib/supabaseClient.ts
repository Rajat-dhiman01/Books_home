import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set in frontend/.env for the member portal to work. ' +
      'Use the Publishable key from Supabase (Settings → API Keys) — never the Secret key here, this code ships to the browser.',
  )
}

// Publishable key only — safe to expose in browser code. Session is persisted
// to localStorage and auto-refreshed by default, so a member stays logged in
// across page reloads until they explicitly sign out or the session expires.
export const supabase = createClient(supabaseUrl, supabasePublishableKey)