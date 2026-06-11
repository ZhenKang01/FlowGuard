import {
  Droplets,
  LayoutDashboard,
  AlertTriangle,
  Package,
  Wrench,
  FileText,
  Settings,
  Users,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useRBAC } from '../../hooks/useRBAC'
import { PERMISSIONS, ROLE_LABELS, ROLE_COLORS } from '../../lib/rbac'

const NAV_ITEMS = [
  { id: 'overview',    icon: LayoutDashboard, label: 'Overview',            permission: PERMISSIONS.DASHBOARD_VIEW },
  { id: 'water',       icon: Droplets,        label: 'Water Monitoring',    permission: PERMISSIONS.WATER_VIEW },
  { id: 'alerts',      icon: AlertTriangle,   label: 'Leak Alerts',         permission: PERMISSIONS.ALERTS_VIEW },
  { id: 'supplies',    icon: Package,         label: 'Sanitation Supplies', permission: PERMISSIONS.SUPPLIES_VIEW },
  { id: 'workorders',  icon: Wrench,          label: 'Work Orders',         permission: PERMISSIONS.WORKORDERS_VIEW },
  { id: 'reports',     icon: FileText,        label: 'Reports',             permission: PERMISSIONS.REPORTS_VIEW },
  { id: 'settings',    icon: Settings,        label: 'Settings',            permission: PERMISSIONS.SETTINGS_VIEW },
  { id: 'users',       icon: Users,           label: 'User Management',     permission: PERMISSIONS.USERS_MANAGE },
]

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email ? email.slice(0, 2).toUpperCase() : '?'
}

export default function Sidebar({ activePage, onNavigate }) {
  const { user, profile, role, signOut } = useAuth()
  const { can } = useRBAC()

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? 'Unknown'
  const initials    = getInitials(profile?.full_name ?? user?.user_metadata?.full_name, user?.email)
  const roleLabel   = ROLE_LABELS[role] ?? role
  const roleBadge   = ROLE_COLORS[role] ?? ROLE_COLORS.viewer

  const visibleNav = NAV_ITEMS.filter(item => can(item.permission))

  return (
    <aside className="flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800 shadow-xl">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/50 shrink-0">
        <Droplets className="w-8 h-8 text-blue-500 mr-3" />
        <span className="text-xl font-bold text-white tracking-tight">FlowGuard</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {visibleNav.map(item => {
          const Icon   = item.icon
          const active = item.id === activePage
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                active
                  ? 'bg-blue-600/10 text-blue-400 font-medium'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 transition-colors shrink-0 ${
                active ? 'text-blue-500' : 'text-slate-400 group-hover:text-white'
              }`} />
              <span className="truncate text-left">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/30 shrink-0">
        <div className="flex items-center px-3 py-3 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 select-none">
            {initials}
          </div>
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-md mt-0.5 ${roleBadge}`}>
              {roleLabel}
            </span>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="ml-2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
