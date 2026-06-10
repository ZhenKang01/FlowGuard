import { waterAnalyticsData } from '../../data/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { ArrowDownRight } from 'lucide-react';

export default function WaterAnalytics() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Water Consumption Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Hourly usage vs baseline expected</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full">
          <ArrowDownRight className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">8% lower than yesterday</span>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={waterAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            
            {/* Highlight abnormal spike area between 12 PM and 6 PM */}
            <ReferenceArea x1="12 PM" x2="6 PM" fill="#fee2e2" fillOpacity={0.4} />

            <Line 
              type="monotone" 
              dataKey="baseline" 
              stroke="#94a3b8" 
              strokeWidth={2} 
              strokeDasharray="5 5" 
              dot={false}
              name="Baseline Expected" 
            />
            <Line 
              type="monotone" 
              dataKey="usage" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
              name="Actual Usage (gal)" 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Insight */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
            <span className="text-slate-600">Actual Usage</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-slate-400 border border-slate-400 mr-2 border-dashed"></span>
            <span className="text-slate-600">Baseline Expected</span>
          </div>
        </div>
        <div className="text-red-500 font-medium text-xs bg-red-50 px-2 py-1 rounded">
          Spike detected at 3 PM
        </div>
      </div>
    </div>
  );
}
