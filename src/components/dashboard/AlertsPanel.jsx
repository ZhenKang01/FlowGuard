import { alertsData } from '../../data/mockData';
import { AlertTriangle, Droplet, Clock } from 'lucide-react';

export default function AlertsPanel() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800">Priority Alerts</h2>
        <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
          {alertsData.length} New
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {alertsData.map((alert) => (
          <div 
            key={alert.id} 
            className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`w-4 h-4 ${alert.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${alert.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}`}>
                  {alert.severity}
                </span>
              </div>
              <span className="text-xs text-slate-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {alert.timeDetected}
              </span>
            </div>
            
            <h3 className="text-sm font-semibold text-slate-800 mb-3 leading-snug">
              {alert.location}
            </h3>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                <Droplet className="w-3 h-3 text-blue-500 mr-1" />
                {alert.waterWasted}
              </div>
              <button className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                Review
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
        View All Alerts
      </button>
    </div>
  );
}
