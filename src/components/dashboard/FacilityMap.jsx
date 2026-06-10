import { facilityRiskData } from '../../data/mockData';
import { Map } from 'lucide-react';

export default function FacilityMap() {
  const getRiskColor = (severity) => {
    switch(severity) {
      case 'red': return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse';
      case 'yellow': return 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]';
      case 'green': return 'bg-emerald-500';
      default: return 'bg-slate-300';
    }
  };

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
        {/* Mock floor plan background lines */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px'
        }}></div>
        
        {/* Abstract blueprint graphic */}
        <div className="w-3/4 h-3/4 border-4 border-blue-200 rounded-lg relative">
          <div className="absolute top-1/2 left-0 right-0 border-t-4 border-blue-200"></div>
          <div className="absolute left-1/2 top-0 bottom-0 border-l-4 border-blue-200"></div>
          
          {/* Sensor Dots */}
          {facilityRiskData.map((node) => (
            <div 
              key={node.id}
              className={`absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${getRiskColor(node.severity)} cursor-pointer transition-transform hover:scale-150`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              title={`Sensor ${node.id} - ${node.severity.toUpperCase()}`}
            >
              {node.severity === 'red' && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex justify-center space-x-6 text-xs text-slate-600">
        <div className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></span>Normal</div>
        <div className="flex items-center"><span className="w-2.5 h-2.5 bg-orange-400 rounded-full mr-2"></span>Warning</div>
        <div className="flex items-center"><span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></span>Critical</div>
      </div>
    </div>
  );
}
