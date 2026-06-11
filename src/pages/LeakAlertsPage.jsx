import { useState, useEffect, useCallback } from 'react'
import { allAlertsData, meterReadings } from '../data/mockData'
import { AlertTriangle, Clock, Droplet, CheckCircle2, RefreshCw, Loader2, Wifi, WifiOff } from 'lucide-react'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'
import { scoreWindow, getAlerts, approveAlert } from '../lib/flowguardApi'

// ── helpers ─────────────────────────────────────────────────────────────────

const TABS = ['All', 'Critical', 'Warning', 'Resolved']

const statusColors = {
  Unresolved:       'bg-red-50 text-red-700 border-red-100',
  Investigating:    'bg-orange-50 text-orange-700 border-orange-100',
  Assigned:         'bg-blue-50 text-blue-700 border-blue-100',
  Resolved:         'bg-emerald-50 text-emerald-700 border-emerald-100',
  active:           'bg-orange-50 text-orange-700 border-orange-100',
  pending_approval: 'bg-purple-50 text-purple-700 border-purple-100',
  approved:         'bg-emerald-50 text-emerald-700 border-emerald-100',
}

const severityColor = {
  low:    'text-yellow-600 bg-yellow-50',
  medium: 'text-orange-600 bg-orange-50',
  high:   'text-red-600 bg-red-50',
}

// ── LiveScanPanel ────────────────────────────────────────────────────────────
// Calls the real LSTM model for every meter on mount (and on Rescan).
// Anomaly decision comes from the model, not from mockData.

function LiveScanPanel() {
  const [results,  setResults]  = useState([])    // [{ meter_id, anomaly, score, threshold } | { meter_id, error }]
  const [scanning, setScanning] = useState(false)

  const runScan = useCallback(() => {
    setScanning(true)
    const meters = Object.keys(meterReadings)
    Promise.allSettled(
      meters.map(id => scoreWindow(id, meterReadings[id]).then(r => ({ ...r, meter_id: id })))
    ).then(settled => {
      setResults(settled.map((s, i) =>
        s.status === 'fulfilled'
          ? s.value
          : { meter_id: meters[i], error: s.reason.message }
      ))
      setScanning(false)
    })
  }, [])

  useEffect(() => { runScan() }, [runScan])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Live Model Scan</h2>
          <p className="text-xs text-slate-400 mt-0.5">LSTM autoencoder verdict per meter — real /score call</p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center space-x-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning…' : 'Rescan'}</span>
        </button>
      </div>

      {scanning && results.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-400 space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Querying model…</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="text-left pb-2 pr-4 font-medium">Meter</th>
                <th className="text-right pb-2 px-4 font-medium">Score</th>
                <th className="text-right pb-2 px-4 font-medium">Threshold</th>
                <th className="text-left pb-2 pl-4 font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {results.map(r => (
                <tr key={r.meter_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 pr-4 font-mono text-slate-700">{r.meter_id}</td>
                  {r.error ? (
                    <td colSpan={3} className="py-2.5 text-xs text-orange-600 pl-4">
                      API error: {r.error}
                    </td>
                  ) : (
                    <>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {r.score.toFixed(5)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                        {r.threshold.toFixed(5)}
                      </td>
                      <td className="py-2.5 pl-4">
                        {r.anomaly
                          ? <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Anomaly</span>
                          : <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Normal</span>
                        }
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── IncomingAlertsPanel ──────────────────────────────────────────────────────
// Polls GET /alerts every 5 s.  Alerts arrive after n8n routes them and POSTs
// back to FastAPI's in-memory store.  "High" severity alerts come in with
// status="pending_approval" — the Approve button sends PATCH /alerts/{id}/approve.

const POLL_INTERVAL_MS = 5000

function IncomingAlertsPanel({ onToast }) {
  const [alerts,    setAlerts]    = useState([])
  const [online,    setOnline]    = useState(true)    // false = API unreachable
  const [approving, setApproving] = useState(null)    // alert id currently being approved

  // Replace local copy of one alert (after approve)
  const patchLocal = (id, patch) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))

  const fetchAlerts = useCallback(() => {
    getAlerts()
      .then(({ alerts }) => { setAlerts(alerts); setOnline(true) })
      .catch(() => setOnline(false))   // silently degrade — never throw
  }, [])

  useEffect(() => {
    fetchAlerts()
    const timer = setInterval(fetchAlerts, POLL_INTERVAL_MS)
    return () => clearInterval(timer)   // cleanup on unmount
  }, [fetchAlerts])

  const handleApprove = async (alertId) => {
    setApproving(alertId)
    try {
      const updated = await approveAlert(alertId)
      patchLocal(alertId, updated)
      onToast('Alert approved — action logged')
    } catch (e) {
      onToast(`Approve failed: ${e.message}`)
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">n8n Incoming Alerts</h2>
          <p className="text-xs text-slate-400 mt-0.5">Routed by n8n workflow · polls every 5 s</p>
        </div>
        <span className={`flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded-full ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
          {online
            ? <><Wifi className="w-3 h-3" /><span>Live</span></>
            : <><WifiOff className="w-3 h-3" /><span>API offline</span></>
          }
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="py-8 text-center text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
          <p className="text-sm">{online ? 'No routed alerts yet' : 'Cannot reach API'}</p>
          <p className="text-xs mt-1">{online ? 'Start n8n and trigger a /score call to see alerts here' : 'Start the FastAPI service: uvicorn src.api:app'}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {alerts.slice().reverse().map(alert => (
            <div key={alert.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-1 mb-1">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${severityColor[alert.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                    {alert.severity}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${statusColors[alert.status] ?? 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                    {alert.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate">{alert.meter_id}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Score {alert.score?.toFixed(4)} · threshold {alert.threshold?.toFixed(4)}
                </p>
                {alert.recommendation && (
                  <p className="text-xs text-purple-700 mt-1 bg-purple-50 px-2 py-1 rounded-lg">
                    {alert.recommendation}
                  </p>
                )}
              </div>
              {alert.status === 'pending_approval' && (
                <button
                  onClick={() => handleApprove(alert.id)}
                  disabled={approving === alert.id}
                  className="shrink-0 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
                >
                  {approving === alert.id && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Approve</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── LeakAlertsPage ───────────────────────────────────────────────────────────

export default function LeakAlertsPage() {
  const [activeTab,     setActiveTab]     = useState('All')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [toast,         setToast]         = useState(null)

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

      {/* KPI strip */}
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

      {/* Real-time panels — live model + n8n incoming */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LiveScanPanel />
        <IncomingAlertsPanel onToast={setToast} />
      </div>

      {/* Static mock alerts — historical reference */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="px-6 pt-5 pb-0">
          <h2 className="text-base font-bold text-slate-800">Alert History</h2>
          <p className="text-xs text-slate-400 mt-0.5">Static reference dataset · not from live model</p>
        </div>

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
