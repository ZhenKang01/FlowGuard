"use client";

import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function LeakDetector() {
  const [hour, setHour] = useState(14);
  const [flowRate, setFlowRate] = useState(135.0);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const buildFormData = () => {
      const formData = new FormData();
      formData.append('hour', hour);
      formData.append('flow_rate', flowRate);
      if (imageFile) {
        formData.append('image', imageFile);
      }
      return formData;
    };

    try {
      // Prioritize Vite env variable; otherwise prefer the local network host
      // because localhost:8000 is sometimes shadowed by another local service.
      const envApiUrl = import.meta.env.VITE_FLOWGUARD_API_URL
        ? `${import.meta.env.VITE_FLOWGUARD_API_URL}/predict`
        : null;
      const networkApiUrl = 'http://127.0.0.1:8000/predict';
      const localhostApiUrl = 'http://localhost:8000/predict';

      const attemptFetch = async (url) => {
        return await fetch(url, {
          method: 'POST',
          body: buildFormData(),
        });
      };

      const endpoints = [
        envApiUrl,
        networkApiUrl,
        localhostApiUrl,
      ].filter(Boolean);

      let response;
      let lastError = null;
      for (const url of endpoints) {
        try {
          response = await attemptFetch(url);
          if (response.ok) {
            break;
          }
          lastError = new Error(`Server error (${response.status}) from ${url}`);
        } catch (networkError) {
          lastError = new Error(`Network/CORS error connecting to ${url}: ${networkError.message}`);
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error("Connection to PyTorch API failed.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Connection to PyTorch API failed.");
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pipe Image (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Tabular Model</p>
                  <p className={`text-lg font-bold ${result.pytorch_detected ? 'text-red-600' : 'text-emerald-600'}`}>
                    {result.pytorch_detected ? 'Leak Detected' : 'Normal'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Probability: {(result.leak_probability * 100).toFixed(1)}%</p>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Vision Model</p>
                  <p className={`text-lg font-bold ${result.roboflow_detected ? 'text-red-600' : 'text-slate-700'}`}>
                    {result.roboflow_detected ? 'Leak Detected' : 'Not Detected'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={result.roboflow_message}>
                    {result.roboflow_message}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-4">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Safety Protocol</p>
                <p className="text-sm font-semibold text-slate-800 break-words">
                  {result.safety_protocol}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}