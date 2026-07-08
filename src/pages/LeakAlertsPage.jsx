import { useState, useMemo } from 'react'
import { allAlertsData } from '../data/mockData'
import { 
  AlertTriangle, Clock, Droplet, CheckCircle2, Search, 
  Download, Map as MapIcon, List, CheckSquare 
} from 'lucide-react'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'
import FacilityMap from '../components/dashboard/FacilityMap'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const TABS = ['All', 'Critical', 'Warning', 'Resolved']

const statusColors = {
  Unresolved:    'bg-red-50 text-red-700 border-red-100',
  Investigating: 'bg-orange-50 text-orange-700 border-orange-100',
  Assigned:      'bg-blue-50 text-blue-700 border-blue-100',
  Resolved:      'bg-emerald-50 text-emerald-700 border-emerald-100',
}

// Generate some mock chart data for the modal based on alert severity
const generateMockChartData = (severity) => {
  const base = severity === 'Critical' ? 40 : 10;
  return Array.from({ length: 10 }).map((_, i) => ({
    time: `-${10 - i}m`,
    flow: i < 5 ? base / 2 : base + Math.random() * 10
  }));
}

export default function LeakAlertsPage() {
  const [activeTab, setActiveTab] = useState('All')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [toast, setToast] = useState(null)
  
  // New States
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('time') // 'time' or 'flow'
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [alerts, setAlerts] = useState(allAlertsData)

  const handleBulkAction = (action) => {
    if (selectedIds.size === 0) return
    setAlerts(prev => prev.map(a => 
      selectedIds.has(a.id) && a.status !== 'Resolved' ? { ...a, status: action } : a
    ))
    setToast(`Bulk action: Marked ${selectedIds.size} alert(s) as ${action}`)
    setSelectedIds(new Set())
  }

  const toggleSelect = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSorted.map(a => a.id)))
    }
  }

  const exportCSV = () => {
    const headers = ['ID', 'Severity', 'Status', 'Location', 'Time Detected', 'Water Loss', 'Description']
    const rows = filteredAndSorted.map(a => 
      [a.id, a.severity, a.status, `"${a.location}"`, a.timeDetected, a.waterWasted, `"${a.description}"`].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leak_alerts_export_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setToast('CSV Exported successfully')
  }

  // Parse time for sorting: very naive heuristic for '10 mins ago', '1 hr ago'
  const parseTime = (str) => {
    if (str.includes('min')) return parseInt(str)
    if (str.includes('hr')) return parseInt(str) * 60
    return 9999
  }

  const filteredAndSorted = useMemo(() => {
    return alerts
      .filter(a => {
        if (activeTab === 'Resolved') return a.status === 'Resolved'
        if (activeTab !== 'All' && a.severity !== activeTab) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          return a.location.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'flow') {
          return parseInt(b.waterWasted) - parseInt(a.waterWasted)
        }
        return parseTime(a.timeDetected) - parseTime(b.timeDetected)
      })
  }, [alerts, activeTab, searchQuery, sortBy])

  const counts = {
    All:      alerts.length,
    Critical: alerts.filter(a => a.severity === 'Critical').length,
    Warning:  alerts.filter(a => a.severity === 'Warning').length,
    Resolved: alerts.filter(a => a.status === 'Resolved').length,
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leak Alerts</h1>
          <p className="text-slate-500 mt-1">Monitor and manage all detected anomalies</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            title="List View"
          >
            <List className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`p-2 rounded-xl transition-colors ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            title="Map View"
          >
            <MapIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Leaks',   value: counts.Critical + counts.Warning - alerts.filter(a => a.status==='Resolved').length, color: 'text-red-600',     border: 'border-red-100'     },
          { label: 'Investigating',  value: alerts.filter(a => a.status === 'Investigating').length, color: 'text-orange-600',  border: 'border-orange-100'  },
          { label: 'Assigned',       value: alerts.filter(a => a.status === 'Assigned').length, color: 'text-blue-600',    border: 'border-blue-100'    },
          { label: 'Resolved Today', value: counts.Resolved, color: 'text-emerald-600', border: 'border-emerald-100' },
        ].map(({ label, value, color, border }) => (
          <div key={label} className={`bg-white rounded-2xl p-5 shadow-sm border ${border}`}>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {viewMode === 'map' ? (
        <div className="h-[600px] mb-8 relative z-0">
          <FacilityMap alerts={filteredAndSorted} onSelectAlert={setSelectedAlert} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 px-6 pt-4 space-y-4 sm:space-y-0 pb-4">
            <div className="flex space-x-6 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
                  className={`pb-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
            
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="time">Sort by Time</option>
                <option value="flow">Sort by Flow Rate</option>
              </select>
              <button 
                onClick={exportCSV}
                className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="bg-blue-50/50 border-b border-blue-100 px-6 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">{selectedIds.size} selected</span>
              </div>
              <div className="flex space-x-2 text-sm">
                <button onClick={() => handleBulkAction('Assigned')} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-700">
                  Assign Tech
                </button>
                <button onClick={() => handleBulkAction('Resolved')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">
                  Mark Resolved
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {filteredAndSorted.length > 0 && (
              <div className="px-6 py-3 flex items-center bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-4"
                  checked={selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0}
                  onChange={toggleSelectAll}
                />
                <span>Alert Details</span>
              </div>
            )}
            
            {filteredAndSorted.length === 0 && (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No alerts found</p>
              </div>
            )}
            
            {filteredAndSorted.map(alert => (
              <div key={alert.id} className={`p-5 pl-6 flex items-start justify-between transition-colors ${selectedIds.has(alert.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                <div className="flex items-start space-x-4 w-full">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-1"
                    checked={selectedIds.has(alert.id)}
                    onChange={() => toggleSelect(alert.id)}
                  />
                  <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${alert.severity === 'Critical' ? 'bg-red-100' : 'bg-orange-100'}`}>
                    <AlertTriangle className={`w-4 h-4 ${alert.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}`} />
                  </div>
                  <div className="flex-1">
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
      )}

      <Modal open={!!selectedAlert} onClose={() => setSelectedAlert(null)} title="Alert Analytics & Review" size="md">
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
            
            {/* Recharts Analytics Sparkline */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Flow Rate Anomaly Spike</p>
                <span className="text-xs font-bold text-red-600">{selectedAlert.waterWasted}</span>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={generateMockChartData(selectedAlert.severity)}>
                    <defs>
                      <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={selectedAlert.severity === 'Critical' ? '#ef4444' : '#f97316'} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={selectedAlert.severity === 'Critical' ? '#ef4444' : '#f97316'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                      formatter={(value) => [`${value.toFixed(1)} gal/hr`, 'Flow']}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="flow" 
                      stroke={selectedAlert.severity === 'Critical' ? '#ef4444' : '#f97316'} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorFlow)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Detected</p>
                <p className="font-semibold text-slate-700">{selectedAlert.timeDetected}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-xs text-red-400 mb-1">Current Loss Rate</p>
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
                  <div className="flex-1 relative">
                    <select 
                      onChange={(e) => {
                        if(e.target.value) {
                          setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, status: 'Assigned' } : a));
                          setToast(`Assigned to ${e.target.value}`);
                          setSelectedAlert(null);
                        }
                      }}
                      className="w-full h-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors appearance-none text-center cursor-pointer"
                      defaultValue=""
                    >
                      <option value="" disabled>Assign Technician</option>
                      <option value="Plumbing Team">Plumbing Team</option>
                      <option value="Marcus R.">Marcus R.</option>
                      <option value="Priya P.">Priya P.</option>
                    </select>
                  </div>
                  <button
                    onClick={() => { 
                      setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, status: 'Resolved' } : a));
                      setToast('Alert marked as resolved'); 
                      setSelectedAlert(null);
                    }}
                    className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl transition-colors"
                  >
                    Mark Resolved
                  </button>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold rounded-xl">
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
