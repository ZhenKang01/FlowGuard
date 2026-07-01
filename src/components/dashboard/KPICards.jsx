import { kpiData } from '../../data/mockData'
import { Droplets, AlertTriangle, PackageCheck, Wrench, DollarSign } from 'lucide-react'

export default function KPICards({ openAlerts = null, openWorkOrders = null }) {
  const cards = [
    {
      title:    'Total Water Usage Today',
      value:    kpiData.waterUsageToday,
      icon:     Droplets,
      color:    'text-blue-500',
      bgColor:  'bg-blue-50',
      trend:    '+2.4%',
      trendUp:  true,
    },
    {
      title:    'Active Leak Alerts',
      value:    openAlerts !== null ? openAlerts : kpiData.activeLeaks,
      icon:     AlertTriangle,
      color:    'text-red-500',
      bgColor:  'bg-red-50',
      trend:    openAlerts !== null ? (openAlerts > 0 ? `${openAlerts} need attention` : 'All clear') : '2 High Priority',
      trendUp:  openAlerts === 0,
    },
    {
      title:    'Supply Readiness',
      value:    kpiData.supplyReadiness,
      icon:     PackageCheck,
      color:    'text-teal-500',
      bgColor:  'bg-teal-50',
      trend:    'Optimal',
      trendUp:  true,
    },
    {
      title:    'Open Work Orders',
      value:    openWorkOrders !== null ? openWorkOrders : kpiData.openWorkOrders,
      icon:     Wrench,
      color:    'text-orange-500',
      bgColor:  'bg-orange-50',
      trend:    openWorkOrders !== null ? (openWorkOrders > 0 ? `${openWorkOrders} in progress` : 'All complete') : '-3 since yesterday',
      trendUp:  openWorkOrders === 0,
    },
    {
      title:    'Est. Monthly Cost',
      value:    kpiData.estMonthlyCost,
      icon:     DollarSign,
      color:    'text-indigo-500',
      bgColor:  'bg-indigo-50',
      trend:    'In budget',
      trendUp:  true,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <div
            key={index}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200 group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {card.value ?? <span className="text-slate-300">—</span>}
              </h3>
              <p className={`text-xs mt-2 font-medium ${card.trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                {card.trend}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
