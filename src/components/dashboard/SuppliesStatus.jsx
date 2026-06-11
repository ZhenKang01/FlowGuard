import { suppliesData } from '../../data/mockData'
import { Package } from 'lucide-react'

export default function SuppliesStatus({ onNavigate }) {
  const getStatusColor = (status) => {
    if (status === 'green')  return 'bg-emerald-500'
    if (status === 'yellow') return 'bg-orange-400'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center">
          <Package className="w-5 h-5 mr-2 text-slate-400" />
          Sanitation Supplies
        </h2>
        <button
          onClick={() => onNavigate('supplies')}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Manage
        </button>
      </div>

      <div className="space-y-4">
        {suppliesData.map((supply, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-slate-700">{supply.item}</span>
              <span className="text-slate-500 font-medium">{supply.level}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full ${getStatusColor(supply.status)} transition-all duration-500`}
                style={{ width: `${supply.level}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
