import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Shield, Phone, Building2, UserCircle, Save } from 'lucide-react'
import Toast from '../components/ui/Toast'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const [toast, setToast] = useState(null)
  
  const [formData, setFormData] = useState({
    name: profile?.full_name ?? user?.user_metadata?.full_name ?? '',
    phone: profile?.phone ?? '',
    department: profile?.department ?? 'General Maintenance',
    emergencyContact: profile?.emergency_contact ?? ''
  })

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = () => {
    setToast('Profile settings saved successfully')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Account Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal information and account settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Quick Info */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <UserCircle className="w-12 h-12" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{formData.name || 'User'}</h2>
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 mt-2 capitalize">
              {profile?.role?.replace('_', ' ') ?? 'Viewer'}
            </span>
            <p className="text-sm text-slate-500 mt-3">{user?.email}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">System Permissions</h3>
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Data Viewing</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <Shield className={`w-4 h-4 ${['admin', 'facility_manager', 'technician'].includes(profile?.role) ? 'text-emerald-500' : 'text-slate-300'}`} />
              <span>Issue Work Orders</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <Shield className={`w-4 h-4 ${['admin', 'facility_manager'].includes(profile?.role) ? 'text-emerald-500' : 'text-slate-300'}`} />
              <span>System Settings</span>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Forms */}
        <div className="col-span-1 md:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Personal Information</h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2 text-slate-400" />
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-slate-400" />
                    Email Address
                  </label>
                  <input
                    value={user?.email ?? ''}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-slate-400" />
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                    <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                    Department
                  </label>
                  <input
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-slate-400" />
                    Emergency Contact
                  </label>
                  <input
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    placeholder="Name and Phone Number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
