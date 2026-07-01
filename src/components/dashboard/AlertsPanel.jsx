import { useState, useEffect } from 'react'
import { AlertTriangle, Droplet, Clock } from 'lucide-react'
import Modal from '../ui/Modal'
import Toast from '../ui/Toast'
import { fetchAlerts, resolveAlertInDB } from '../../lib/supabaseQueries'

const severityColor = {
  high:   { icon: 'text-red-500',    badge: 'text-red-500'    },
  medium: { icon: 'text-orange-500', badge: 'text-orange-500' },
  low:    { icon: 'text-yellow-500', badge: 'text-yellow-500' },
}

const statusColors = {
  active:           'bg-orange-50 text-orange-700 border-orange-100',
  pending_approval: 'bg-purple-50 text-purple-700 border-purple-100',
  approved:         'bg-emerald-50 text-emerald-700 border-emerald-100',
  resolved:         'bg-slate-50 text-slate-500 border-slate-200',
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AlertsPanel({ onNavigate }) {
  const [alerts,        setAlerts]        = useState([])
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [toast,         setToast]         = useState(null)

  useEffect(() => {
    fetchAlerts({ limit: 3 }).then(({ data }) => setAlerts(data ?? []))
  }, [])

  const activeCount = alerts.filter(a => a.status !== 'resolved').length

  const handleResolve = async () => {
    const { error } = await resolveAlertInDB(selectedAlert.id)
    if (error) { setToast(`Error: ${error.message}`); return }
    setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, status: 'resolved' } : a))
    setSelectedAlert(null)
    setToast('Alert marked as resolved')
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800">Priority Alerts</h2>
        <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
          {activeCount} New
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No alerts yet</p>
        ) : alerts.map(alert => {
          const sc = severityColor[alert.severity] ?? severityColor.medium
          return (
            <div
              key={alert.id}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`w-4 h-4 ${sc.icon}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${sc.badge}`}>
                    {alert.severity}
                  </span>
                </div>
                <span className="text-xs text-slate-400 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {timeAgo(alert.timestamp ?? alert.created_at)}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-800 mb-3 leading-snug">{alert.meter_id}</h3>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                  <Droplet className="w-3 h-3 text-blue-500 mr-1" />
                  Score {alert.score?.toFixed(4)}
                </div>
                <button
                  onClick={() => setSelectedAlert(alert)}
                  className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Review
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => onNavigate('alerts')}
        className="w-full mt-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
      >
        View All Alerts
      </button>

      <Modal open={!!selectedAlert} onClose={() => setSelectedAlert(null)} title="Alert Details" size="md">
        {selectedAlert && (
          <div className="space-y-5">
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${severityColor[selectedAlert.severity]?.badge ?? 'text-slate-600'} bg-slate-100`}>
                {selectedAlert.severity}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${statusColors[selectedAlert.status] ?? 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                {selectedAlert.status?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Meter</p>
              <p className="text-slate-800 font-semibold">{selectedAlert.meter_id}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Score</p>
                <p className="font-semibold text-slate-700">{selectedAlert.score?.toFixed(5)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-xs text-red-400 mb-1">Threshold</p>
                <p className="font-semibold text-red-700">{selectedAlert.threshold?.toFixed(5)}</p>
              </div>
            </div>
            {selectedAlert.recommendation && (
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Recommendation</p>
                <p className="text-sm text-slate-600 leading-relaxed">{selectedAlert.recommendation}</p>
              </div>
            )}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleResolve}
                className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl transition-colors"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => setSelectedAlert(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
