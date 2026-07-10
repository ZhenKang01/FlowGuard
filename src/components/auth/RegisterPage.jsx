import { useState } from 'react'
import { Droplets, Mail, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

function getPasswordStrength(pw) {
  if (!pw) return null
  let score = 0
  if (pw.length >= 8)                                      score++
  if (pw.length >= 12)                                     score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))               score++
  if (/[0-9]/.test(pw))                                    score++
  if (/[^A-Za-z0-9]/.test(pw))                             score++

  if (score <= 1) return { level: 1, label: 'Weak',   bar: 'bg-red-500',     text: 'text-red-400' }
  if (score === 2) return { level: 2, label: 'Fair',   bar: 'bg-orange-400',  text: 'text-orange-400' }
  if (score === 3) return { level: 3, label: 'Good',   bar: 'bg-yellow-400',  text: 'text-yellow-400' }
  return             { level: 4, label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-400' }
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function RegisterPage({ onSwitchToLogin }) {
  const { signUp, verifyOtp } = useAuth()
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [consent, setConsent]     = useState(false)
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [pendingEmail, setPendingEmail] = useState(null)
  const [otp, setOtp]             = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  const strength       = getPasswordStrength(password)
  const mismatch       = confirm.length > 0 && password !== confirm
  const submitDisabled = loading || mismatch || !consent

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm)   return setError('Passwords do not match.')
    if (password.length < 8)    return setError('Password must be at least 8 characters.')
    if (!consent)               return setError('You must provide consent to register.')

    setError(null)
    setLoading(true)
    try {
      const result = await signUp(email.trim(), password, fullName.trim())
      if (!result.session) {
        // Supabase email confirmation is enabled — show check-email screen
        setPendingEmail(email.trim())
      }
      // If session exists, AuthContext updates user state → ProtectedRoute will show the app
    } catch (err) {
      setError(err.message ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Email confirmation pending ────────────────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (!otp) return setError('Please enter the OTP.')
    
    setError(null)
    setOtpLoading(true)
    try {
      await verifyOtp(pendingEmail, otp.trim())
      // Successful verification automatically updates the AuthContext session
      // which will unmount this page and show the Dashboard.
    } catch (err) {
      setError(err.message ?? 'Verification failed. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  if (pendingEmail) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-8">
            <div className="w-16 h-16 bg-blue-500/15 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/25">
              <Mail className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-2">
              We sent a 6-digit confirmation code to
            </p>
            <p className="text-white font-medium mb-6">{pendingEmail}</p>

            {error && (
              <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-center tracking-widest text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={otpLoading || !otp}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {otpLoading ? <><Spinner /> Verifying…</> : 'Verify Account'}
              </button>
            </form>
            
            <div className="mt-6">
              <button
                onClick={onSwitchToLogin}
                className="text-slate-500 hover:text-slate-400 text-sm font-medium transition-colors"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Registration form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mr-3 ring-1 ring-blue-500/30">
            <Droplets className="w-6 h-6 text-blue-400" />
          </div>
          <span className="text-3xl font-bold text-white tracking-tight">flowguard</span>
        </div>

        {/* Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl shadow-slate-950/50 p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
          <p className="text-slate-400 text-sm mb-6">
            Register for access to the facility management system
          </p>

          {error && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@facility.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {strength && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.level ? strength.bar : 'bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${strength.text}`}>{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
                    mismatch
                      ? 'border-red-500/60 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-slate-700 focus:ring-blue-500/30 focus:border-blue-500'
                  }`}
                />
              </div>
              {mismatch && <p className="text-red-400 text-xs mt-1">Passwords do not match</p>}
            </div>

            {/* PDPA data notice */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                  Personal Data Notice (PDPA)
                </span>
              </div>
              <dl className="text-xs space-y-2">
                {[
                  ['Data collected',  'Full name, email address only'],
                  ['Purpose',         'Authentication and role-based access to the facility management system'],
                  ['Access',          'System administrators and your own account'],
                  ['Retention',       'Retained until you request account deletion'],
                  ['Your rights',     'You may request access, correction, or deletion through a system administrator'],
                ].map(([term, desc]) => (
                  <div key={term} className="flex gap-1.5">
                    <dt className="text-slate-300 font-medium shrink-0">{term}:</dt>
                    <dd className="text-slate-400">{desc}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Consent checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <div className="relative mt-0.5 shrink-0" onClick={() => setConsent(v => !v)}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  consent
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-600 bg-slate-800 group-hover:border-slate-500'
                }`}>
                  {consent && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-400 leading-relaxed">
                I have read the Personal Data Notice above and{' '}
                <span className="text-slate-200">consent to the collection and processing</span>{' '}
                of my personal data (full name and email) for the purpose of facility management access.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full py-2.5 mt-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? <><Spinner /> Creating account…</> : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
