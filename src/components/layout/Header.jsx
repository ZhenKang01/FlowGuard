import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Menu, Building, ChevronDown, Download, X, CheckCircle } from 'lucide-react'
import { buildingsList, notificationsData } from '../../data/mockData'

const PAGE_TITLES = {
  overview:   'Facility Overview',
  water:      'Water Monitoring',
  alerts:     'Leak Alerts',
  supplies:   'Sanitation Supplies',
  workorders: 'Work Orders',
  reports:    'Reports',
  settings:   'Settings',
  users:      'User Management',
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (ref.current && !ref.current.contains(e.target)) handler() }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

export default function Header({ onMenuClick, activePage, onNavigate }) {
  const [searchQuery, setSearchQuery]         = useState('')
  const [buildingOpen, setBuildingOpen]       = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState('All Buildings')
  const [notifOpen, setNotifOpen]             = useState(false)
  const [notifications, setNotifications]     = useState(notificationsData)

  const buildingRef = useRef(null)
  const notifRef    = useRef(null)

  useClickOutside(buildingRef, () => setBuildingOpen(false))
  useClickOutside(notifRef,    () => setNotifOpen(false))

  const unread = notifications.filter(n => !n.read).length

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10">

      <div className="flex items-center flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">
          {PAGE_TITLES[activePage] ?? 'FlowGuard'}
        </h1>
      </div>

      <div className="flex items-center space-x-3 lg:space-x-4">

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-56 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Building filter */}
        <div ref={buildingRef} className="relative hidden sm:block">
          <button
            onClick={() => setBuildingOpen(o => !o)}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-sm"
          >
            <Building className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">{selectedBuilding}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${buildingOpen ? 'rotate-180' : ''}`} />
          </button>
          {buildingOpen && (
            <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-44">
              {buildingsList.map(b => (
                <button
                  key={b}
                  onClick={() => { setSelectedBuilding(b); setBuildingOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                    b === selectedBuilding ? 'font-semibold text-blue-600' : 'text-slate-700'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Generate Report */}
        <button
          onClick={() => onNavigate('reports')}
          className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/20 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Generate Report</span>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 z-20 bg-white rounded-2xl shadow-2xl border border-slate-100 w-80">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="font-bold text-slate-800">Notifications</span>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className={`px-5 py-4 hover:bg-slate-50 transition-colors ${n.read ? 'opacity-60' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-slate-300' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-slate-100">
                <button
                  onClick={() => { onNavigate('alerts'); setNotifOpen(false) }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all alerts →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
