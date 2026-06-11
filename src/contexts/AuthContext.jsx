import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Fetch profile; if absent, create it from auth metadata (handles email-confirmation flow
// where the profile insert in signUp ran before the session was active).
async function fetchOrCreateProfile(userId, metadata) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('id', userId)
    .single()

  if (existing) return existing

  const { data: created } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, full_name: metadata?.full_name ?? null, role: 'viewer' },
      { onConflict: 'id' }
    )
    .select()
    .single()

  return created ?? null
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const resolveSession = useCallback(async (session) => {
    const sessionUser = session?.user ?? null
    setUser(sessionUser)
    if (sessionUser) {
      const p = await fetchOrCreateProfile(sessionUser.id, sessionUser.user_metadata)
      setProfile(p)
    } else {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await resolveSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await resolveSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [resolveSession])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error

    // Attempt immediate profile creation. Succeeds when email confirmation is
    // disabled (session is active). Silently ignored when confirmation is pending —
    // fetchOrCreateProfile handles it on first sign-in.
    if (data.user) {
      await supabase
        .from('profiles')
        .upsert(
          { id: data.user.id, full_name: fullName, role: 'viewer' },
          { onConflict: 'id' }
        )
    }

    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Role resolution: profiles table → app_metadata → user_metadata → viewer
  const role =
    profile?.role ??
    user?.app_metadata?.role ??
    user?.user_metadata?.role ??
    'viewer'

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
