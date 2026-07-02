"use client";

import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function LeakDetector() {
  const [hour, setHour] = useState(14);
  const [flowRate, setFlowRate] = useState(135.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hour: parseInt(hour, 10),
          flow_rate: parseFloat(flowRate)
        })
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError("Connection to PyTorch API failed. Please ensure the machine learning server is active on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">PyTorch Anomaly Detection</h2>
          <p className="text-sm text-slate-500">Diagnostic Dashboard Component</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Column */}
        <div>
          <form onSubmit={handlePredict} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hour of Day (0-23)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Flow Rate (gallons per hour)
              </label>
              <input
                type="number"
                step="any"
                value={flowRate}
                onChange={(e) => setFlowRate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-colors flex justify-center items-center ${
                loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <span>Run Diagnostic</span>
              )}
            </button>
          </form>
        </div>

        {/* Results Column */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col justify-center min-h-[200px]">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {!error && !result && !loading && (
            <div className="text-center text-slate-400 flex flex-col items-center">
              <Info className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Submit the form to view model inference results.</p>
            </div>
          )}

          {loading && !error && (
            <div className="text-center text-blue-500 animate-pulse font-medium">
              Processing...
            </div>
          )}

          {result && !loading && !error && (
            <div className="space-y-6">
              <div className={`p-4 rounded-xl border ${result.is_leak_detected ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                {result.is_leak_detected ? (
                  <div className="flex items-center space-x-3 text-red-700 font-bold text-lg">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                    <span>🚨 LEAK DETECTED</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 text-emerald-700 font-bold text-lg">
                    <CheckCircle className="w-6 h-6" />
                    <span>System Normal (No Leak)</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Leak Probability</p>
                  <p className="text-xl font-bold text-slate-800">
                    {typeof result.leak_probability === 'number' 
                      ? (result.leak_probability * 100).toFixed(2) + '%' 
                      : result.leak_probability}
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Safety Protocol</p>
                  <p className="text-sm font-semibold text-slate-800 break-words">
                    {result.safety_protocol}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}