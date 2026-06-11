import { useState, useEffect } from 'react'
import { waterAnalyticsData, meterReadings } from '../../data/mockData'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts'
import { ArrowDownRight, Loader2 } from 'lucide-react'
import { scoreWindow } from '../../lib/flowguardApi'

// We score meter_02 because our mock readings put it in anomalous territory
// (sustained ~400 L/hr). The badge reflects the model's real decision.
const DEMO_METER = 'meter_02'

export default function WaterAnalytics() {
  const [verdict, setVerdict] = useState(null)  // { anomaly, score, threshold } or null
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    scoreWindow(DEMO_METER, meterReadings[DEMO_METER])
      .then(r  => { setVerdict(r); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // The badge in the header corner — three possible states
  const Badge = () => {
    if (loading) return (
      <span className="flex items-center space-x-1.5 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Scanning model…</span>
      </span>
    )
    if (error) return (
      <span className="text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full"
            title={error}>
        Model offline
      </span>
    )
    return verdict?.anomaly
      ? (
        <span className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
          Anomaly — {DEMO_METER} (score {verdict.score.toFixed(4)})
        </span>
      ) : (
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
          Normal — {DEMO_METER} (score {verdict?.score.toFixed(4)})
        </span>
      )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">

      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Water Consumption Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Hourly usage vs baseline expected</p>
        </div>
        <div className="flex flex-col items-end space-y-1.5">
          <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full">
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">8% lower than yesterday</span>
          </div>
          {/* Real model verdict — replaces the former static "Spike detected" label */}
          <Badge />
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={waterAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="time"
              axisLine={false} tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }} dy={10}
            />
            <YAxis
              axisLine={false} tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <ReferenceArea x1="12 PM" x2="6 PM" fill="#fee2e2" fillOpacity={0.4} />
            <Line
              type="monotone" dataKey="baseline"
              stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5"
              dot={false} name="Baseline Expected"
            />
            <Line
              type="monotone" dataKey="usage"
              stroke="#3b82f6" strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
              name="Actual Usage (gal)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
            <span className="text-slate-600">Actual Usage</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-slate-400 mr-2" />
            <span className="text-slate-600">Baseline Expected</span>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Verdict from LSTM autoencoder · mock readings
        </p>
      </div>
    </div>
  )
}
