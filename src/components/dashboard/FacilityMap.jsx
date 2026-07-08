import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Map, AlertTriangle } from 'lucide-react'
import { allAlertsData } from '../../data/mockData'

// Helper to create custom HTML markers for Leaflet using Tailwind classes
const createCustomMarker = (severity) => {
  let outerColor, innerColor;
  
  if (severity === 'Critical') {
    outerColor = 'bg-red-500 animate-ping opacity-75';
    innerColor = 'bg-red-600 shadow-[0_0_15px_rgba(239,68,68,1)]';
  } else if (severity === 'Warning') {
    outerColor = 'bg-orange-400 animate-pulse opacity-60';
    innerColor = 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]';
  } else {
    outerColor = 'bg-emerald-500 opacity-20';
    innerColor = 'bg-emerald-600';
  }

  const html = `
    <div class="relative flex items-center justify-center w-6 h-6">
      <span class="absolute inline-flex w-full h-full rounded-full ${outerColor}"></span>
      <span class="relative inline-flex rounded-full w-3 h-3 ${innerColor}"></span>
    </div>
  `;

  return new L.divIcon({
    html,
    className: 'bg-transparent border-none',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

export default function FacilityMap({ alerts, onSelectAlert }) {
  // If no alerts provided (like on Dashboard), fallback to all active alerts
  const displayAlerts = alerts || allAlertsData.filter(a => a.status !== 'Resolved');
  
  // Center of SF or average of all alerts
  const center = [37.7745, -122.4190];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center p-6 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Facility Risk Map</h2>
          <p className="text-sm text-slate-500">Live geographic sensor status</p>
        </div>
        <Map className="w-5 h-5 text-slate-400" />
      </div>

      <div className="flex-1 relative z-0 min-h-[300px]">
        <MapContainer 
          center={center} 
          zoom={15} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Clean professional style
          />
          
          {displayAlerts.map(alert => (
            alert.lat && alert.lng && (
              <Marker 
                key={alert.id} 
                position={[alert.lat, alert.lng]}
                icon={createCustomMarker(alert.severity)}
                eventHandlers={{
                  click: () => {
                    if (onSelectAlert) onSelectAlert(alert);
                  }
                }}
              >
                {!onSelectAlert && (
                  <Popup className="rounded-xl border-none">
                    <div className="p-1 min-w-[180px]">
                      <div className="flex items-center space-x-2 mb-2">
                         <div className={`p-1.5 rounded-lg ${alert.severity === 'Critical' ? 'bg-red-100' : 'bg-orange-100'}`}>
                           <AlertTriangle className={`w-3.5 h-3.5 ${alert.severity === 'Critical' ? 'text-red-500' : 'text-orange-500'}`} />
                         </div>
                         <span className="font-bold text-slate-800 text-sm">{alert.severity}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">{alert.location}</p>
                      <p className="text-xs text-slate-500">Loss rate: <strong className="text-red-600">{alert.waterWasted}</strong></p>
                    </div>
                  </Popup>
                )}
              </Marker>
            )
          ))}
        </MapContainer>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center space-x-6 text-xs font-medium text-slate-600 shrink-0">
        <div className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2 shadow-sm" />Normal</div>
        <div className="flex items-center"><span className="w-2.5 h-2.5 bg-orange-400 rounded-full mr-2 shadow-sm animate-pulse" />Warning</div>
        <div className="flex items-center"><span className="relative flex h-2.5 w-2.5 mr-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span>Critical</div>
      </div>
    </div>
  )
}
