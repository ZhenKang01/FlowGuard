import { useState, useEffect } from 'react'
import { AlertTriangle, Info, WifiOff } from 'lucide-react'

export default function LeakAlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('http://localhost:8000/alerts')
        if (!res.ok) throw new Error('API Error')
        const data = await res.json()
        setAlerts(data)
        setApiError(false)
      } catch (err) {
        setApiError(true)
      }
    }
    
    fetchAlerts()
    const int = setInterval(fetchAlerts, 5000)
    return () => clearInterval(int)
  }, [])

  if (apiError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-red-100">
        <WifiOff className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-red-700">API Unreachable</h2>
        <p className="text-red-500 mt-2">Could not connect to the alerts API. Retrying...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Leak Alerts</h1>
        <p className="text-slate-500 mt-1">Monitor and manage all detected anomalies</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {alerts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              No alerts found.
            </div>
          ) : (
            alerts.map((alert, idx) => {
              if (alert.needs_approval) {
                return (
                  <div key={idx} className="p-5 flex items-start space-x-4 bg-red-50 hover:bg-red-100 transition-colors">
                    <div className="mt-0.5 p-2 rounded-xl shrink-0 bg-red-100 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-red-600">Action Required</span>
                        <span className="text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">{alert.severity}</span>
                      </div>
                      <p className="text-base font-semibold text-slate-900">{alert.meter_id}</p>
                      <p className="text-sm text-red-700 mt-1 font-medium">{alert.message}</p>
                      <div className="mt-3 bg-red-100 border border-red-200 px-4 py-3 rounded-lg">
                        <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">Recommended Action</p>
                        <p className="text-sm font-semibold text-red-900">{alert.recommended_action}</p>
                      </div>
                      <p className="text-xs text-red-500 mt-3 font-medium">{new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                )
              }

              return (
                <div key={idx} className="p-5 flex items-start space-x-4 bg-yellow-50 hover:bg-yellow-100 transition-colors">
                  <div className="mt-0.5 p-2 rounded-xl shrink-0 bg-yellow-100 text-yellow-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-yellow-600">Standard Notification</span>
                      <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{alert.severity}</span>
                    </div>
                    <p className="text-base font-semibold text-slate-900">{alert.meter_id}</p>
                    <p className="text-sm text-yellow-800 mt-1 font-medium">{alert.message}</p>
                    <p className="text-xs text-yellow-600 mt-3 font-medium">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
