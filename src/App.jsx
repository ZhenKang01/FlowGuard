import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import KPICards from './components/dashboard/KPICards';
import WaterAnalytics from './components/dashboard/WaterAnalytics';
import AlertsPanel from './components/dashboard/AlertsPanel';
import SuppliesStatus from './components/dashboard/SuppliesStatus';
import WorkOrders from './components/dashboard/WorkOrders';
import FacilityMap from './components/dashboard/FacilityMap';
import ReportsPreview from './components/dashboard/ReportsPreview';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Top Row: KPIs */}
            <KPICards />

            {/* Middle Row: Analytics & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <WaterAnalytics />
              </div>
              <div className="lg:col-span-1">
                <AlertsPanel />
              </div>
            </div>

            {/* Bottom Row: Supplies, Map, Work Orders, Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <SuppliesStatus />
                <ReportsPreview />
              </div>
              <div className="lg:col-span-1">
                <FacilityMap />
              </div>
              <div className="lg:col-span-1">
                <WorkOrders />
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
