import { useState } from 'react'
import { waterAnalyticsData, waterAnalyticsDataWeek, waterAnalyticsDataMonth } from '../data/mockData'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts'
import { Droplets, TrendingDown, Activity, Zap } from 'lucide-react'

const TIME_RANGES = ['Today', 'This Week', 'This Month']

const meterRows = [
  { meter: 'Meter 00', building: 'Building A', usage: '2,840 gal', baseline: '2,600 gal', delta: '+9%',  status: 'warning'  },
  { meter: 'Meter 01', building: 'Building B', usage: '3,120 gal', baseline: '3,100 gal', delta: '+1%',  status: 'ok'       },
  { meter: 'Meter 02', building: 'Building C', usage: '4,050 gal', baseline: '2,800 gal', delta: '+45%', status: 'critical' },
  { meter: 'Meter 03', building: 'Building D', usage: '1,280 gal', baseline: '1,300 gal', delta: '−2%',  status: 'ok'       },
  { meter: 'Meter 04', building: 'Campus Ext', usage: '1,160 gal', baseline: '1,200 gal', delta: '−3%',  status: 'ok'       },
]

const statusBadge = {
  ok:       'bg-emerald-50 text-emerald-700',
  warning:  'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
}

export default function WaterMonitoringPage() {
  const [activeRange, setActiveRange] = useState('Today')

  const chartData = activeRange === 'Today' ? waterAnalyticsData
    : activeRange === 'This Week' ? waterAnalyticsDataWeek
    : waterAnalyticsDataMonth

  const kpis = activeRange === 'Today'
    ? [
        { icon: Droplets,     label: 'Total Today',  value: '12,450 gal', sub: 'Across all meters',  color: 'text-blue-600 bg-blue-50'    },
        { icon: TrendingDown, label: 'vs Yesterday', value: '−8%',        sub: 'Below expected',     color: 'text-emerald-600 bg-emerald-50' },
        { icon: Activity,     label: 'Peak Hour',    value: '3 PM',       sub: '1,250 gal/hr',       color: 'text-orange-600 bg-orange-50' },
        { icon: Zap,          label: 'Avg Hourly',   value: '520 gal/hr', sub: 'Normal range',       color: 'text-violet-600 bg-violet-50' },
      ]
    : activeRange === 'This Week'
    ? [
        { icon: Droplets,     label: 'Total This Week',  value: '77,250 gal', sub: 'Across all meters',  color: 'text-blue-600 bg-blue-50'    },
        { icon: TrendingDown, label: 'vs Last Week',     value: '+2%',        sub: 'Slight increase',    color: 'text-orange-600 bg-orange-50' },
        { icon: Activity,     label: 'Peak Day',         value: 'Thu',        sub: '13,000 gal/d',       color: 'text-orange-600 bg-orange-50' },
        { icon: Zap,          label: 'Avg Daily',        value: '11,035 gal', sub: 'Normal range',       color: 'text-violet-600 bg-violet-50' },
      ]
    : [
        { icon: Droplets,     label: 'Total This Month', value: '309,250 gal', sub: 'Across all meters', color: 'text-blue-600 bg-blue-50'    },
        { icon: TrendingDown, label: 'vs Last Month',    value: '−1%',         sub: 'Below expected',    color: 'text-emerald-600 bg-emerald-50' },
        { icon: Activity,     label: 'Peak Week',        value: 'Week 4',      sub: '79,000 gal/w',      color: 'text-orange-600 bg-orange-50' },
        { icon: Zap,          label: 'Avg Weekly',       value: '77,312 gal',  sub: 'Normal range',      color: 'text-violet-600 bg-violet-50' },
      ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Water Monitoring</h1>
          <p className="text-slate-500 mt-1">Real-time consumption across all meters</p>
        </div>
        <div className="flex items-center space-x-1 bg-slate-100 rounded-xl p-1">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeRange === r
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Hourly Consumption</h2>
            <p className="text-sm text-slate-500 mt-1">Actual usage vs expected baseline — {activeRange}</p>
          </div>
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
            {activeRange === 'Today' ? 'Spike detected at 3 PM' : 'No recent anomalies'}
          </span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              {activeRange === 'Today' && (
                <ReferenceArea x1="12 PM" x2="6 PM" fill="#fee2e2" fillOpacity={0.4} />
              )}
              <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Baseline" />
              <Line type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }} name="Actual (gal)" />
            </LineChart>

          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Per-Meter Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 text-left font-medium">Meter</th>
                <th className="p-4 text-left font-medium">Building</th>
                <th className="p-4 text-left font-medium">Today's Usage</th>
                <th className="p-4 text-left font-medium">Baseline</th>
                <th className="p-4 text-left font-medium">vs Baseline</th>
                <th className="p-4 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meterRows.map(row => (
                <tr key={row.meter} className="hover:bg-slate-50">
                  <td className="p-4 font-semibold text-slate-800">{row.meter}</td>
                  <td className="p-4 text-slate-600">{row.building}</td>
                  <td className="p-4 text-slate-700">{row.usage}</td>
                  <td className="p-4 text-slate-500">{row.baseline}</td>
                  <td className="p-4">
                    <span className={`font-semibold ${row.status === 'ok' ? 'text-emerald-600' : row.status === 'warning' ? 'text-orange-500' : 'text-red-600'}`}>
                      {row.delta}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[row.status]}`}>
                      {row.status === 'ok' ? 'Normal' : row.status === 'warning' ? 'Elevated' : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
