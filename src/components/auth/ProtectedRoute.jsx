import { Droplets } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useRBAC } from '../../hooks/useRBAC'
import AuthScreen from './AuthScreen'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center ring-1 ring-blue-500/30 animate-pulse">
          <Droplets className="w-6 h-6 text-blue-400" />
        </div>
        <p className="text-slate-500 text-sm">Loading FlowGuard…</p>
      </div>
    </div>
  )
}

function AccessDenied({ permission }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-4xl mb-3">🔒</p>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Access Restricted</h2>
        <p className="text-slate-500 text-sm">
          You don't have permission to view this section.
          {permission && <span className="block mt-1 font-mono text-xs text-slate-400">Required: {permission}</span>}
        </p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children, permission }) {
  const { user, loading } = useAuth()
  const { can } = useRBAC()

  if (loading) return <LoadingScreen />
  if (!user)   return <AuthScreen />
  if (permission && !can(permission)) return <AccessDenied permission={permission} />

  return children
}
