import { 
  Droplets, 
  LayoutDashboard, 
  AlertTriangle, 
  Package, 
  Wrench, 
  FileText, 
  Settings 
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: Droplets, label: 'Water Monitoring', active: false },
  { icon: AlertTriangle, label: 'Leak Alerts', active: false },
  { icon: Package, label: 'Sanitation Supplies', active: false },
  { icon: Wrench, label: 'Work Orders', active: false },
  { icon: FileText, label: 'Reports', active: false },
  { icon: Settings, label: 'Settings', active: false },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800 shadow-xl">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/50">
        <Droplets className="w-8 h-8 text-blue-500 mr-3" />
        <span className="text-xl font-bold text-white tracking-tight">FlowGuard</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <a
              key={index}
              href="#"
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                item.active 
                  ? 'bg-blue-600/10 text-blue-400 font-medium' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 transition-colors ${item.active ? 'text-blue-500' : 'text-slate-400 group-hover:text-white'}`} />
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center px-4 py-3 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors">
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            JD
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">Jane Doe</p>
            <p className="text-xs text-slate-400 truncate">Facility Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
