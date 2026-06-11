import { useState, useRef, useEffect } from 'react'
import { allWorkOrdersData } from '../data/mockData'
import { Plus, MoreHorizontal } from 'lucide-react'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'

const TABS = ['All', 'High Priority', 'In Progress', 'Completed']

function priorityBadge(p) {
  const s = {
    High:   'bg-red-50 text-red-700 border-red-100',
    Medium: 'bg-orange-50 text-orange-700 border-orange-100',
    Low:    'bg-slate-50 text-slate-700 border-slate-200',
  }
  return `text-xs font-medium px-2 py-1 rounded-md border ${s[p] ?? s.Low}`
}

function StatusDot({ status }) {
  const colors = {
    'In Progress': 'bg-blue-500',
    Pending:       'bg-orange-500',
    Scheduled:     'bg-slate-300',
    Completed:     'bg-emerald-500',
  }
  return <span className={`inline-block w-2 h-2 rounded-full mr-2 shrink-0 ${colors[status] ?? 'bg-slate-300'}`} />
}

function ContextMenu({ order, onClose, onAction }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute right-10 top-0 z-10 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-44">
      {['View Details', 'Reassign', 'Mark Complete', 'Cancel'].map(action => (
        <button
          key={action}
          onClick={() => { onAction(action, order); onClose() }}
          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
            action === 'Cancel' ? 'text-red-500' : 'text-slate-700'
          }`}
        >
          {action}
        </button>
      ))}
    </div>
  )
}

export default function WorkOrdersPage() {
  const [activeTab, setActiveTab] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)
  const [toast, setToast] = useState(null)

  const filtered = allWorkOrdersData.filter(o => {
    if (activeTab === 'All')          return true
    if (activeTab === 'High Priority') return o.priority === 'High'
    if (activeTab === 'In Progress')   return o.status === 'In Progress'
    if (activeTab === 'Completed')     return o.status === 'Completed'
    return true
  })

  const counts = {
    'All':          allWorkOrdersData.length,
    'High Priority': allWorkOrdersData.filter(o => o.priority === 'High').length,
    'In Progress':   allWorkOrdersData.filter(o => o.status === 'In Progress').length,
    'Completed':     allWorkOrdersData.filter(o => o.status === 'Completed').length,
  }

  const handleMenuAction = (action, order) => {
    if (action === 'View Details') { setSelectedOrder(order); return }
    setToast(`${action}: ${order.id}`)
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Work Orders</h1>
          <p className="text-slate-500 mt-1">Track and manage all maintenance tasks</p>
        </div>
        <button
          onClick={() => setToast('New work order form coming soon')}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Work Order</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center border-b border-slate-100 px-6 pt-4 space-x-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 text-left font-medium">Task</th>
                <th className="p-4 text-left font-medium hidden sm:table-cell">Team</th>
                <th className="p-4 text-left font-medium">Priority</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium hidden md:table-cell">Due</th>
                <th className="p-4 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <button onClick={() => setSelectedOrder(order)} className="text-left hover:text-blue-600 transition-colors">
                      <div className="font-semibold text-slate-800">{order.task}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{order.id} · {order.location}</div>
                    </button>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">{order.team}</span>
                  </td>
                  <td className="p-4"><span className={priorityBadge(order.priority)}>{order.priority}</span></td>
                  <td className="p-4">
                    <div className="flex items-center text-slate-600 whitespace-nowrap">
                      <StatusDot status={order.status} />{order.status}
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 hidden md:table-cell">{order.dueDate}</td>
                  <td className="p-4 text-right relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === order.id ? null : order.id)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {openMenu === order.id && (
                      <ContextMenu order={order} onClose={() => setOpenMenu(null)} onAction={handleMenuAction} />
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 text-sm">
                    No work orders in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={selectedOrder?.id ?? ''} size="md">
        {selectedOrder && (
          <div className="space-y-5">
            <div>
              <p className="text-lg font-semibold text-slate-800">{selectedOrder.task}</p>
              <p className="text-sm text-slate-500 mt-1">{selectedOrder.location}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Team</p>
                <p className="text-sm font-semibold text-slate-700">{selectedOrder.team}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Priority</p>
                <p className={`text-sm font-semibold ${selectedOrder.priority === 'High' ? 'text-red-600' : selectedOrder.priority === 'Medium' ? 'text-orange-600' : 'text-slate-600'}`}>
                  {selectedOrder.priority}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Due</p>
                <p className="text-sm font-semibold text-slate-700">{selectedOrder.dueDate}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Details</p>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedOrder.description}</p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => { setToast(`${selectedOrder.id} marked complete`); setSelectedOrder(null) }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Mark Complete
              </button>
              <button
                onClick={() => { setToast(`Reassignment for ${selectedOrder.id} requested`); setSelectedOrder(null) }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
              >
                Reassign
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
