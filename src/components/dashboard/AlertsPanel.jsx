import { useState } from 'react'
import { alertsData } from '../../data/mockData'
import { AlertTriangle, Droplet, Clock } from 'lucide-react'
import Modal from '../ui/Modal'
import Toast from '../ui/Toast'

const statusColors = {
  Unresolved:    'bg-red-50 text-red-700 border-red-100',
  Investigating: 'bg-orange-50 text-orange-700 border-orange-100',
  Assigned:      'bg-blue-50 text-blue-700 border-blue-100',
  Resolved:      'bg-emerald-50 text-emerald-700 border-emerald-100',
}

export default function AlertsPanel({ onNavigate }) {
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [toast, setToast] = useState(null)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800">Priority Alerts</h2>
        <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
          {alertsData.length} New
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {alertsData.map(alert => (
          <div
            key={alert.id}
            className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`w-4 h-4 ${alert.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${alert.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}`}>
                  {alert.severity}
                </span>
              </div>
              <span className="text-xs text-slate-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {alert.timeDetected}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-slate-800 mb-3 leading-snug">{alert.location}</h3>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                <Droplet className="w-3 h-3 text-blue-500 mr-1" />
                {alert.waterWasted}
              </div>
              <button
                onClick={() => setSelectedAlert(alert)}
                className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Review
              </button>
            </div>
          </div>
        ))}
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
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
