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
  const [aal, setAal]         = useState(null)
  const [loading, setLoading] = useState(true)

  const resolveSession = useCallback(async (session) => {
    const sessionUser = session?.user ?? null
    setUser(sessionUser)
    if (sessionUser) {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      setAal(aalData)
      const p = await fetchOrCreateProfile(sessionUser.id, sessionUser.user_metadata)
      setProfile(p)
    } else {
      setProfile(null)
      setAal(null)
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

  async function verifyOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup'
    })
    if (error) throw error
    return data
  }

  async function resetPasswordForEmail(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
    return data
  }

  async function verifyPasswordResetOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery'
    })
    if (error) throw error
    return data
  }

  async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    return data
  }

  // MFA Functions
  async function enrollMfa(friendlyName) {
    const { data, error } = await supabase.auth.mfa.enroll({ 
      factorType: 'totp',
      friendlyName: friendlyName || 'Authenticator App'
    })
    if (error) throw error
    return data
  }

  async function challengeMfa(factorId) {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId })
    if (error) throw error
    return data
  }

  async function verifyMfa(factorId, challengeId, code) {
    const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
    if (error) throw error
    // Refresh session to upgrade to AAL2
    const { data: sessionData } = await supabase.auth.getSession()
    await resolveSession(sessionData.session)
    return data
  }
  
  async function listMfaFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    return data
  }

  async function unenrollMfa(factorId) {
    const { data, error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw error
    return data
  }

  // Role resolution: profiles table → app_metadata → user_metadata → viewer
  const role =
    profile?.role ??
    user?.app_metadata?.role ??
    user?.user_metadata?.role ??
    'viewer'

  return (
    <AuthContext.Provider value={{ 
      user, profile, role, aal, loading, 
      signIn, signUp, signOut, verifyOtp,
      resetPasswordForEmail, verifyPasswordResetOtp, updatePassword,
      enrollMfa, challengeMfa, verifyMfa, listMfaFactors, unenrollMfa
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
