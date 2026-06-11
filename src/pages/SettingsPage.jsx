import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Bell, Sliders, Save } from 'lucide-react'
import Toast from '../components/ui/Toast'

const TABS = [
  { id: 'profile',       icon: User,    label: 'Profile'           },
  { id: 'notifications', icon: Bell,    label: 'Notifications'     },
  { id: 'thresholds',    icon: Sliders, label: 'Alert Thresholds'  },
]

function ProfileTab({ user, profile }) {
  const [name, setName] = useState(profile?.full_name ?? user?.user_metadata?.full_name ?? '')
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
        <input
          value={user?.email ?? ''}
          readOnly
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-not-allowed"
        />
        <p className="text-xs text-slate-400 mt-1.5">Email cannot be changed here. Contact your administrator.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
        <input
          value={profile?.role?.replace('_', ' ') ?? 'viewer'}
          readOnly
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-not-allowed capitalize"
        />
        <p className="text-xs text-slate-400 mt-1.5">Role is managed by an administrator.</p>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    criticalAlerts:   true,
    warningAlerts:    true,
    workOrderUpdates: true,
    supplyAlerts:     false,
    weeklyReport:     true,
    emailNotifs:      true,
  })

  const items = [
    { key: 'criticalAlerts',   label: 'Critical Leak Alerts',    sub: 'Immediate notification for critical severity events' },
    { key: 'warningAlerts',    label: 'Warning Alerts',          sub: 'Notifications for warning-level sensor readings'     },
    { key: 'workOrderUpdates', label: 'Work Order Updates',      sub: 'Status changes on work orders you are assigned to'   },
    { key: 'supplyAlerts',     label: 'Supply Level Alerts',     sub: 'Notifications when supplies fall below reorder point' },
    { key: 'weeklyReport',     label: 'Weekly Summary Report',   sub: 'Automated weekly report delivered every Monday'      },
    { key: 'emailNotifs',      label: 'Email Notifications',     sub: 'Receive all alerts via email in addition to in-app'  },
  ]

  return (
    <div className="space-y-1 max-w-lg">
      {items.map(({ key, label, sub }) => (
        <div key={key} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
          <div className="pr-6">
            <p className="text-sm font-medium text-slate-800">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, [key]: !prev[key] }))}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${settings[key] ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      ))}
    </div>
  )
}

function ThresholdsTab() {
  const [vals, setVals] = useState({ criticalFlow: '200', warningFlow: '100', flatlineMax: '2', windowHours: '24' })

  const fields = [
    { key: 'criticalFlow', label: 'Critical Flow Threshold (L/hr)', sub: 'Readings above this are flagged as Critical' },
    { key: 'warningFlow',  label: 'Warning Flow Threshold (L/hr)',  sub: 'Readings above this are flagged as Warning'  },
    { key: 'flatlineMax',  label: 'Flatline Detection Max (L/hr)',  sub: 'Sustained readings below this trigger a sensor fault check' },
    { key: 'windowHours',  label: 'Scoring Window (hours)',         sub: 'Number of hourly readings per anomaly window' },
  ]

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm text-slate-500">
        These thresholds configure the anomaly detection engine. Changes take effect at the next scoring cycle.
      </p>
      {fields.map(({ key, label, sub }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
          <p className="text-xs text-slate-400 mb-2">{sub}</p>
          <input
            type="number"
            value={vals[key]}
            onChange={e => setVals(prev => ({ ...prev, [key]: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [toast, setToast] = useState(null)

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your profile and system preferences</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 lg:p-8">
          {activeTab === 'profile'       && <ProfileTab user={user} profile={profile} />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'thresholds'    && <ThresholdsTab />}

          <div className="mt-8">
            <button
              onClick={() => setToast('Settings saved successfully')}
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
