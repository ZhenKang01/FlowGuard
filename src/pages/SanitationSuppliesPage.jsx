import { useState } from 'react'
import { suppliesData, suppliesUsageHistory } from '../data/mockData'
import { Package, AlertCircle, RefreshCw, Download } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Toast from '../components/ui/Toast'

export default function SanitationSuppliesPage() {
  const [toast, setToast] = useState(null)
  const [reordering, setReordering] = useState({})
  const [inventory, setInventory] = useState(suppliesData)
  const [usageInputs, setUsageInputs] = useState({})

  const criticalCount = inventory.filter(s => s.status === 'red').length
  const lowCount      = inventory.filter(s => s.status === 'yellow').length
  const okCount       = inventory.filter(s => s.status === 'green').length

  const handleReorder = (item) => {
    setReordering(prev => ({ ...prev, [item]: true }))
    setTimeout(() => {
      setReordering(prev => ({ ...prev, [item]: false }))
      setToast(`Reorder placed for ${item}`)
    }, 1200)
  }

  const handleUse = (itemName) => {
    const useAmount = parseInt(usageInputs[itemName]) || 0
    if (useAmount <= 0) return

    setInventory(prev => prev.map(s => {
      if (s.item !== itemName) return s
      const currentStock = parseInt(s.stock)
      let newStock = currentStock - useAmount
      if (newStock < 0) newStock = 0
      
      let maxStock = 100
      if (s.level > 0 && currentStock > 0) {
         maxStock = currentStock / (s.level / 100)
      }
      const newLevel = Math.max(0, Math.round((newStock / maxStock) * 100))
      
      let newStatus = 'green'
      if (newStock <= s.reorderPoint) {
        newStatus = newLevel <= 20 ? 'red' : 'yellow'
      }

      const unit = s.stock.replace(/[0-9]/g, '').trim()
      
      return {
        ...s,
        stock: `${newStock} ${unit}`,
        level: newLevel,
        status: newStatus
      }
    }))
    setUsageInputs(prev => ({ ...prev, [itemName]: '' }))
    setToast(`Recorded ${useAmount} used for ${itemName}`)
  }

  const getBarColor = (status) => {
    if (status === 'green') return 'bg-emerald-500'
    if (status === 'yellow') return 'bg-orange-400'
    return 'bg-red-500'
  }

  const getStatusBadge = (status) => {
    if (status === 'green') return { label: 'OK',       cls: 'bg-emerald-50 text-emerald-700' }
    if (status === 'yellow') return { label: 'Low',     cls: 'bg-orange-50 text-orange-700'  }
    return                          { label: 'Critical', cls: 'bg-red-50 text-red-700'        }
  }

  const downloadCSV = () => {
    if (!suppliesUsageHistory || !suppliesUsageHistory.length) return
    const headers = Object.keys(suppliesUsageHistory[0])
    const csvRows = [
      headers.join(','),
      ...suppliesUsageHistory.map(row => headers.map(fieldName => JSON.stringify(row[fieldName])).join(','))
    ]
    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'supplies_usage_history.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sanitation Supplies</h1>
        <p className="text-slate-500 mt-1">Inventory levels and reorder management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center space-x-4">
          <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
          <div>
            <p className="text-3xl font-bold text-red-700">{criticalCount}</p>
            <p className="text-sm text-red-500 mt-0.5">Critical — Reorder Now</p>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 flex items-center space-x-4">
          <Package className="w-8 h-8 text-orange-500 shrink-0" />
          <div>
            <p className="text-3xl font-bold text-orange-700">{lowCount}</p>
            <p className="text-sm text-orange-500 mt-0.5">Low — Order Soon</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center space-x-4">
          <Package className="w-8 h-8 text-emerald-500 shrink-0" />
          <div>
            <p className="text-3xl font-bold text-emerald-700">{okCount}</p>
            <p className="text-sm text-emerald-500 mt-0.5">Items Well-Stocked</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-lg font-bold text-slate-800">Inventory Status</h2>
          <button
            onClick={() => setToast('All critical items flagged for reorder')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reorder All Critical</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {inventory.map(supply => {
            const { label, cls } = getStatusBadge(supply.status)
            const busy = reordering[supply.item]
            return (
              <div key={supply.item} className="p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800">{supply.item}</span>
                    <div className="flex items-center space-x-3 ml-3 shrink-0">
                      <span className="text-sm text-slate-500">{supply.stock}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${getBarColor(supply.status)}`}
                        style={{ width: `${supply.level}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 font-medium w-9 text-right">{supply.level}%</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center space-x-3">
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1">
                    <input 
                      type="number"
                      min="1"
                      className="w-16 px-2 py-1 text-sm bg-transparent outline-none text-slate-700"
                      placeholder="Qty"
                      value={usageInputs[supply.item] || ''}
                      onChange={(e) => setUsageInputs(prev => ({ ...prev, [supply.item]: e.target.value }))}
                    />
                    <button
                      onClick={() => handleUse(supply.item)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors shadow-sm"
                    >
                      Use
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleReorder(supply.item)}
                    disabled={busy}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                      busy
                        ? 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed'
                        : supply.status === 'red'
                          ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
                          : supply.status === 'yellow'
                            ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {busy ? 'Ordering...' : 'Reorder'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Historical Usage (Previous Month)</h2>
            <p className="text-sm text-slate-500 mt-1">Daily consumption of supplies</p>
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
        <div className="p-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={suppliesUsageHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line type="monotone" dataKey="Soap Dispensers" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Toilet Paper" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Hand Sanitizer" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Cleaning Chemicals" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Paper Towels" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

