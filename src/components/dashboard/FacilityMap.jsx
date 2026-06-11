import { useState } from 'react'
import { facilityRiskData } from '../../data/mockData'
import { Map, X } from 'lucide-react'

const severityRing = {
  red:    'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse',
  yellow: 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]',
  green:  'bg-emerald-500',
}

const severityLabel = { red: 'Critical', yellow: 'Warning', green: 'Normal' }

const severityBadge = {
  red:    'bg-red-100 text-red-700',
  yellow: 'bg-orange-100 text-orange-700',
  green:  'bg-emerald-100 text-emerald-700',
}

export default function FacilityMap() {
  const [selectedSensor, setSelectedSensor] = useState(null)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Facility Risk Map</h2>
          <p className="text-sm text-slate-500">Live sensor status across campus</p>
        </div>
        <Map className="w-5 h-5 text-slate-400" />
      </div>

      <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center min-h-[200px]">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }} />

        <div className="w-3/4 h-3/4 border-4 border-blue-200 rounded-lg relative">
          <div className="absolute top-1/2 left-0 right-0 border-t-4 border-blue-200" />
          <div className="absolute left-1/2 top-0 bottom-0 border-l-4 border-blue-200" />

          {facilityRiskData.map(node => (
            <button
              key={node.id}
              className={`absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${severityRing[node.severity]} cursor-pointer transition-transform hover:scale-150 focus:outline-none focus:scale-150`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => setSelectedSensor(node)}
              title={`${node.name} — click for details`}
            >
              {node.severity === 'red' && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
              )}
            </button>
          ))}

          {/* Sensor popup */}
          {selectedSensor && (
            <div
              className="absolute z-10 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-52"
              style={{
                left: `${Math.min(selectedSensor.x, 55)}%`,
                top:  `${Math.min(selectedSensor.y + 10, 70)}%`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-800">{selectedSensor.name}</span>
                <button onClick={() => setSelectedSensor(null)} className="text-slate-400 hover:text-slate-600 -mr-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">{selectedSensor.location}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Reading</span>
                  <span className="font-semibold text-slate-700">{selectedSensor.reading}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Last checked</span>
                  <span className="font-medium text-slate-600">{selectedSensor.lastChecked}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-400">Status</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${severityBadge[selectedSensor.severity]}`}>
                    {severityLabel[selectedSensor.severity]}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-center space-x-6 text-xs text-slate-600">
        <div className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2" />Normal</div>
        <div className="flex items-center"><span className="w-2.5 h-2.5 bg-orange-400 rounded-full mr-2" />Warning</div>
        <div className="flex items-center"><span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2" />Critical</div>
      </div>
    </div>
  )
}
