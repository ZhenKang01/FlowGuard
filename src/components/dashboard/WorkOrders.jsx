import { useState, useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import Toast from '../ui/Toast'
import { fetchWorkOrders, updateWorkOrderStatus } from '../../lib/supabaseQueries'

function getPriorityBadge(severity) {
  const styles = {
    High:   'bg-red-50 text-red-700 border-red-100',
    Medium: 'bg-orange-50 text-orange-700 border-orange-100',
    Low:    'bg-slate-50 text-slate-700 border-slate-200',
  }
  return `text-xs font-medium px-2 py-1 rounded-md border ${styles[severity] ?? styles.Low}`
}

function getStatusDot(status) {
  const colors = {
    'Open':        'bg-orange-500',
    'In Progress': 'bg-blue-500',
    'Resolved':    'bg-emerald-500',
    'Closed':      'bg-slate-300',
  }
  return <span className={`w-2 h-2 rounded-full mr-2 shrink-0 inline-block ${colors[status] ?? 'bg-slate-300'}`} />
}

export default function WorkOrders({ onNavigate }) {
  const [orders, setOrders] = useState([])
  const [toast,  setToast]  = useState(null)

  useEffect(() => {
    fetchWorkOrders({ limit: 5 }).then(({ data }) => setOrders(data ?? []))
  }, [])

  const handleMarkComplete = async (order) => {
    const { error } = await updateWorkOrderStatus(order.id, 'Resolved')
    if (error) { setToast(`Error: ${error.message}`); return }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Resolved' } : o))
    setToast(`${order.issue_type} marked as resolved`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col overflow-hidden">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Recent Work Orders</h2>
        <button
          onClick={() => onNavigate('workorders')}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View All
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        {orders.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No work orders yet</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Task</th>
                <th className="p-4 font-medium">Severity</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{order.issue_type}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{order.location}</div>
                  </td>
                  <td className="p-4">
                    <span className={getPriorityBadge(order.severity)}>{order.severity}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center text-slate-600 whitespace-nowrap">
                      {getStatusDot(order.status)}
                      {order.status}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleMarkComplete(order)}
                      disabled={order.status === 'Resolved' || order.status === 'Closed'}
                      className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-1 rounded transition-colors"
                      title="Mark complete"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
