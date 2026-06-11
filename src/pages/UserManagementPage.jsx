import { useState } from 'react'
import { usersData } from '../data/mockData'
import { ROLE_LABELS, ROLE_COLORS } from '../lib/rbac'
import { UserPlus, ChevronDown } from 'lucide-react'
import Toast from '../components/ui/Toast'

const ALL_ROLES = ['admin', 'facility_manager', 'technician', 'viewer']

export default function UserManagementPage() {
  const [users, setUsers] = useState(usersData)
  const [toast, setToast] = useState(null)
  const [editRoleId, setEditRoleId] = useState(null)

  const changeRole = (userId, newRole) => {
    const user = users.find(u => u.id === userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    setEditRoleId(null)
    setToast(`${user.name}'s role updated to ${ROLE_LABELS[newRole]}`)
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 mt-1">Manage team members and their access levels</p>
        </div>
        <button
          onClick={() => setToast('Invitation email sent')}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite User</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ALL_ROLES.map(role => (
          <div key={role} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-3xl font-bold text-slate-800">{users.filter(u => u.role === role).length}</p>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md mt-2 ${ROLE_COLORS[role]}`}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Team Members</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 text-left font-medium">User</th>
                <th className="p-4 text-left font-medium hidden sm:table-cell">Email</th>
                <th className="p-4 text-left font-medium">Role</th>
                <th className="p-4 text-left font-medium hidden md:table-cell">Last Active</th>
                <th className="p-4 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 hidden sm:table-cell">{user.email}</td>
                  <td className="p-4 relative">
                    <button
                      onClick={() => setEditRoleId(editRoleId === user.id ? null : user.id)}
                      className={`inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${ROLE_COLORS[user.role]} hover:opacity-80 transition-opacity`}
                    >
                      <span>{ROLE_LABELS[user.role]}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {editRoleId === user.id && (
                      <div className="absolute left-4 top-12 z-10 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-48">
                        {ALL_ROLES.map(r => (
                          <button
                            key={r}
                            onClick={() => changeRole(user.id, r)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                              r === user.role ? 'font-semibold text-blue-600' : 'text-slate-700'
                            }`}
                          >
                            {ROLE_LABELS[r]}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-slate-500 hidden md:table-cell">{user.lastActive}</td>
                  <td className="p-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
