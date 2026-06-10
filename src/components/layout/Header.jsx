import { Bell, Search, Menu, Building, ChevronDown, Download } from 'lucide-react';

export default function Header({ onMenuClick }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10">
      
      {/* Left section */}
      <div className="flex items-center flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">Facility Overview</h1>
      </div>

      {/* Center/Right section */}
      <div className="flex items-center space-x-3 lg:space-x-6">
        
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Building Filter */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
          <Building className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">All Buildings</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>

        {/* Action Button */}
        <button className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/20 transition-colors">
          <Download className="w-4 h-4" />
          <span>Generate Report</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
