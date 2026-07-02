import { useState } from 'react'
import { Droplets, Mail, Lock, AlertCircle, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage({ onSwitchToRegister }) {
  const { signIn, resetPasswordForEmail, verifyPasswordResetOtp, updatePassword } = useAuth()
  
  // 'login', 'forgot_email', 'forgot_otp', 'forgot_password'
  const [viewMode, setViewMode]   = useState('login') 
  
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  
  // Forgot password states
  const [resetEmail, setResetEmail] = useState('')
  const [resetOtp, setResetOtp]     = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message ?? 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestOtp(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resetPasswordForEmail(resetEmail)
      setSuccessMsg(`Recovery OTP sent to ${resetEmail}`)
      setViewMode('forgot_otp')
    } catch (err) {
      setError(err.message ?? 'Failed to send recovery email.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await verifyPasswordResetOtp(resetEmail, resetOtp)
      setSuccessMsg('Code verified. Please enter your new password.')
      setViewMode('forgot_password')
    } catch (err) {
      setError(err.message ?? 'Invalid or expired OTP.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await updatePassword(newPassword)
      // updating password successfully means we are logged in with the new password.
      // the AuthContext onAuthStateChange will handle navigating to dashboard.
    } catch (err) {
      setError(err.message ?? 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  const renderError = () => error && (
    <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )

  const renderSuccess = () => successMsg && (
    <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
      <AlertCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
      <p className="text-emerald-400 text-sm">{successMsg}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center mb-10">
          <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mr-3 ring-1 ring-blue-500/30">
            <Droplets className="w-6 h-6 text-blue-400" />
          </div>
          <span className="text-3xl font-bold text-white tracking-tight">FlowGuard</span>
        </div>

        {/* Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl shadow-slate-950/50 p-8">
          
          {viewMode === 'login' && (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Sign in to your account</h2>
              <p className="text-slate-400 text-sm mb-7">Enter your credentials to access the facility dashboard</p>
              
              {renderError()}
              {renderSuccess()}

              <form onSubmit={handleLogin} className="space-y-5">
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

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => { setViewMode('forgot_email'); setError(null); setSuccessMsg(null); }}
                      className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </>
          )}

          {viewMode === 'forgot_email' && (
            <>
              <button onClick={() => { setViewMode('login'); setError(null); setSuccessMsg(null); }} className="flex items-center text-sm text-slate-400 hover:text-white mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to login
              </button>
              <h2 className="text-xl font-semibold text-white mb-1">Reset Password</h2>
              <p className="text-slate-400 text-sm mb-7">Enter your email and we'll send you an OTP to reset your password.</p>
              
              {renderError()}
              
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="you@facility.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !resetEmail}
                  className="w-full py-2.5 mt-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Sending...' : 'Send Recovery OTP'}
                </button>
              </form>
            </>
          )}

          {viewMode === 'forgot_otp' && (
            <>
              <button onClick={() => { setViewMode('forgot_email'); setError(null); setSuccessMsg(null); }} className="flex items-center text-sm text-slate-400 hover:text-white mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to email
              </button>
              <h2 className="text-xl font-semibold text-white mb-1">Enter OTP</h2>
              <p className="text-slate-400 text-sm mb-7">Enter the 6-digit recovery code sent to your email.</p>
              
              {renderError()}
              {renderSuccess()}
              
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Recovery Code</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={resetOtp}
                      onChange={e => setResetOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !resetOtp}
                  className="w-full py-2.5 mt-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            </>
          )}

          {viewMode === 'forgot_password' && (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">New Password</h2>
              <p className="text-slate-400 text-sm mb-7">Create a new, strong password for your account.</p>
              
              {renderError()}
              {renderSuccess()}
              
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full py-2.5 mt-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}

        </div>

        {viewMode === 'login' && (
          <p className="text-center text-slate-500 text-sm mt-6">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign up
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
