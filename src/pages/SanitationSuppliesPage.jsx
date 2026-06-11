import { useState } from 'react'
import { suppliesData } from '../data/mockData'
import { Package, AlertCircle, RefreshCw } from 'lucide-react'
import Toast from '../components/ui/Toast'

export default function SanitationSuppliesPage() {
  const [toast, setToast] = useState(null)
  const [reordering, setReordering] = useState({})

  const criticalCount = suppliesData.filter(s => s.status === 'red').length
  const lowCount      = suppliesData.filter(s => s.status === 'yellow').length
  const okCount       = suppliesData.filter(s => s.status === 'green').length

  const handleReorder = (item) => {
    setReordering(prev => ({ ...prev, [item]: true }))
    setTimeout(() => {
      setReordering(prev => ({ ...prev, [item]: false }))
      setToast(`Reorder placed for ${item}`)
    }, 1200)
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
          {suppliesData.map(supply => {
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
                <button
                  onClick={() => handleReorder(supply.item)}
                  disabled={busy}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    busy
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : supply.status === 'red'
                        ? 'bg-red-50 hover:bg-red-100 text-red-700'
                        : supply.status === 'yellow'
                          ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {busy ? 'Ordering...' : 'Reorder'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
