import { useState } from 'react'
import { allAlertsData } from '../data/mockData'
import { AlertTriangle, Clock, Droplet, CheckCircle2 } from 'lucide-react'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'

const TABS = ['All', 'Critical', 'Warning', 'Resolved']

const statusColors = {
  Unresolved:    'bg-red-50 text-red-700 border-red-100',
  Investigating: 'bg-orange-50 text-orange-700 border-orange-100',
  Assigned:      'bg-blue-50 text-blue-700 border-blue-100',
  Resolved:      'bg-emerald-50 text-emerald-700 border-emerald-100',
}

export default function LeakAlertsPage() {
  const [activeTab, setActiveTab] = useState('All')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [toast, setToast] = useState(null)

  const filtered = allAlertsData.filter(a => {
    if (activeTab === 'All')      return true
    if (activeTab === 'Resolved') return a.status === 'Resolved'
    return a.severity === activeTab
  })

  const counts = {
    All:      allAlertsData.length,
    Critical: allAlertsData.filter(a => a.severity === 'Critical').length,
    Warning:  allAlertsData.filter(a => a.severity === 'Warning').length,
    Resolved: allAlertsData.filter(a => a.status === 'Resolved').length,
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Leak Alerts</h1>
        <p className="text-slate-500 mt-1">Monitor and manage all detected anomalies</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Leaks',   value: '3', color: 'text-red-600',     border: 'border-red-100'     },
          { label: 'Investigating',  value: '1', color: 'text-orange-600',  border: 'border-orange-100'  },
          { label: 'Assigned',       value: '1', color: 'text-blue-600',    border: 'border-blue-100'    },
          { label: 'Resolved Today', value: '3', color: 'text-emerald-600', border: 'border-emerald-100' },
        ].map(({ label, value, color, border }) => (
          <div key={label} className={`bg-white rounded-2xl p-5 shadow-sm border ${border}`}>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center border-b border-slate-100 px-6 pt-4 space-x-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No alerts in this category</p>
            </div>
          )}
          {filtered.map(alert => (
            <div key={alert.id} className="p-5 flex items-start justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-start space-x-4">
                <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${alert.severity === 'Critical' ? 'bg-red-100' : 'bg-orange-100'}`}>
                  <AlertTriangle className={`w-4 h-4 ${alert.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}`} />
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-1 flex-wrap gap-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${alert.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}`}>
                      {alert.severity}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${statusColors[alert.status]}`}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{alert.location}</p>
                  <div className="flex items-center space-x-4 mt-1.5 text-xs text-slate-400">
                    <span className="flex items-center"><Clock className="w-3 h-3 mr-1" />{alert.timeDetected}</span>
                    <span className="flex items-center"><Droplet className="w-3 h-3 mr-1 text-blue-400" />{alert.waterWasted}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlert(alert)}
                className="shrink-0 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors ml-4"
              >
                Review
              </button>
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!selectedAlert} onClose={() => setSelectedAlert(null)} title="Alert Details" size="md">
        {selectedAlert && (
          <div className="space-y-5">
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedAlert.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                {selectedAlert.severity}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${statusColors[selectedAlert.status]}`}>
                {selectedAlert.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Location</p>
              <p className="text-slate-800 font-semibold">{selectedAlert.location}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Detected</p>
                <p className="font-semibold text-slate-700">{selectedAlert.timeDetected}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-xs text-red-400 mb-1">Water Loss Rate</p>
                <p className="font-semibold text-red-700">{selectedAlert.waterWasted}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedAlert.description}</p>
            </div>
            <div className="flex space-x-3 pt-2">
              {selectedAlert.status !== 'Resolved' ? (
                <>
                  <button
                    onClick={() => { setToast('Technician assigned'); setSelectedAlert(null) }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Assign Technician
                  </button>
                  <button
                    onClick={() => { setToast('Alert marked as resolved'); setSelectedAlert(null) }}
                    className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl transition-colors"
                  >
                    Mark Resolved
                  </button>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center py-2.5 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Resolved
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
