import { useState } from 'react'
import { useDashboardKPIs } from './hooks/useDashboardKPIs'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import MenuChatWidget from './components/chat/MenuChatWidget'
import KPICards from './components/dashboard/KPICards'
import WaterAnalytics from './components/dashboard/WaterAnalytics'
import AlertsPanel from './components/dashboard/AlertsPanel'
import SuppliesStatus from './components/dashboard/SuppliesStatus'
import WorkOrders from './components/dashboard/WorkOrders'
import FacilityMap from './components/dashboard/FacilityMap'
import ReportsPreview from './components/dashboard/ReportsPreview'
import LeakDetector from './components/LeakDetector'

import WaterMonitoringPage from './pages/WaterMonitoringPage'
import LeakAlertsPage from './pages/LeakAlertsPage'
import SanitationSuppliesPage from './pages/SanitationSuppliesPage'
import WorkOrdersPage from './pages/WorkOrdersPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import UserManagementPage from './pages/UserManagementPage'
import ProfilePage from './pages/ProfilePage'

function Dashboard({ onNavigate }) {
  const { openAlerts, openWorkOrders } = useDashboardKPIs()
  return (
    <div className="space-y-6">
      <KPICards openAlerts={openAlerts} openWorkOrders={openWorkOrders} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><WaterAnalytics /></div>
        <div className="lg:col-span-1"><AlertsPanel onNavigate={onNavigate} /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <SuppliesStatus onNavigate={onNavigate} />
          <ReportsPreview onNavigate={onNavigate} />
        </div>
        <div className="lg:col-span-1"><FacilityMap /></div>
        <div className="lg:col-span-1"><WorkOrders onNavigate={onNavigate} /></div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <LeakDetector />
      </div>
    </div>
  )
}

const PAGE_MAP = {
  water:      WaterMonitoringPage,
  alerts:     LeakAlertsPage,
  supplies:   SanitationSuppliesPage,
  workorders: WorkOrdersPage,
  reports:    ReportsPage,
  settings:   SettingsPage,
  users:      UserManagementPage,
  profile:    ProfilePage,
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState('overview')

  const navigate = (page) => {
    setActivePage(page)
    setSidebarOpen(false)
  }

  const PageComponent = PAGE_MAP[activePage]

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar activePage={activePage} onNavigate={navigate} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          activePage={activePage}
          onNavigate={navigate}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activePage === 'overview'
              ? <Dashboard onNavigate={navigate} />
              : <PageComponent onNavigate={navigate} />
            }
          </div>
        </main>
      </div>

      {/* Chat widget — fixed position, renders above all page content */}
      <MenuChatWidget />
    </div>
  )
}
