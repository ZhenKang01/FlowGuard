import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, MoreHorizontal, Loader2 } from 'lucide-react'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import { fetchWorkOrders, createWorkOrder, updateWorkOrderStatus } from '../lib/supabaseQueries'
import { useAuth } from '../contexts/AuthContext'

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
    'Open':        'bg-orange-500',
    'In Progress': 'bg-blue-500',
    'Resolved':    'bg-emerald-500',
    'Closed':      'bg-slate-300',
  }
  return <span className={`inline-block w-2 h-2 rounded-full mr-2 shrink-0 ${colors[status] ?? 'bg-slate-300'}`} />
}

function ContextMenu({ order, onClose, onAction, isAdmin }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const actions = ['View Details', 'Mark Complete']
  if (isAdmin) actions.push('Delete Order')
  actions.push('Cancel')

  return (
    <div ref={ref} className="absolute right-10 top-0 z-10 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-44">
      {actions.map(action => (
        <button
          key={action}
          onClick={() => { onAction(action, order); onClose() }}
          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
            action === 'Cancel' || action === 'Delete Order' ? 'text-red-500' : 'text-slate-700'
          }`}
        >
          {action}
        </button>
      ))}
    </div>
  )
}

const EMPTY_FORM = { location: '', issue_type: '', severity: 'Medium', description: '' }

export default function WorkOrdersPage() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [activeTab,     setActiveTab]     = useState('All')
  const [orders,        setOrders]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [openMenu,      setOpenMenu]      = useState(null)
  const [showNew,       setShowNew]       = useState(false)
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [submitting,    setSubmitting]    = useState(false)
  const [toast,         setToast]         = useState(null)

  const reload = useCallback(() => {
    fetchWorkOrders().then(({ data }) => {
      setOrders(data ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    reload()
    const channel = supabase
      .channel('work-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, reload)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [reload])

  const filtered = orders.filter(o => {
    if (activeTab === 'All')           return true
    if (activeTab === 'High Priority') return o.severity === 'High'
    if (activeTab === 'In Progress')   return o.status === 'In Progress'
    if (activeTab === 'Completed')     return o.status === 'Resolved' || o.status === 'Closed'
    return true
  })

  const counts = {
    'All':           orders.length,
    'High Priority': orders.filter(o => o.severity === 'High').length,
    'In Progress':   orders.filter(o => o.status === 'In Progress').length,
    'Completed':     orders.filter(o => o.status === 'Resolved' || o.status === 'Closed').length,
  }

  const handleMenuAction = async (action, order) => {
    if (action === 'View Details') { setSelectedOrder(order); return }
    if (action === 'Mark Complete') {
      const { error } = await updateWorkOrderStatus(order.id, 'Resolved')
      if (error) { setToast(`Error: ${error.message}`); return }
      setToast('Work order marked as resolved')
    }
    if (action === 'Delete Order') {
      const { error } = await supabase.from('work_orders').delete().eq('id', order.id)
      if (error) { setToast(`Error: ${error.message}`); return }
      setToast('Work order deleted')
      reload()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await createWorkOrder({
      ...form,
      status:          'Open',
      created_by_role: role,
      source:          'manual',
    })
    setSubmitting(false)
    if (error) { setToast(`Error: ${error.message}`); return }
    setShowNew(false)
    setForm(EMPTY_FORM)
    setToast('Work order created')
  }

  const handleMarkComplete = async () => {
    const { error } = await updateWorkOrderStatus(selectedOrder.id, 'Resolved')
    if (error) { setToast(`Error: ${error.message}`); return }
    setSelectedOrder(null)
    setToast('Work order marked as resolved')
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Work Orders</h1>
          <p className="text-slate-500 mt-1">Track and manage all maintenance tasks</p>
        </div>
        <div className="flex items-center space-x-3">
          {isAdmin && (
            <button
              onClick={() => setToast('Viewing all facility logs (Not implemented)')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              View All Logs
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Work Order</span>
            </button>
          )}
        </div>
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
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading work orders…</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 text-left font-medium">Task</th>
                  <th className="p-4 text-left font-medium">Severity</th>
                  <th className="p-4 text-left font-medium">Status</th>
                  <th className="p-4 text-left font-medium hidden md:table-cell">Created</th>
                  <th className="p-4 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <button onClick={() => setSelectedOrder(order)} className="text-left hover:text-blue-600 transition-colors">
                        <div className="font-semibold text-slate-800">{order.issue_type}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{order.location}</div>
                      </button>
                    </td>
                    <td className="p-4"><span className={priorityBadge(order.severity)}>{order.severity}</span></td>
                    <td className="p-4">
                      <div className="flex items-center text-slate-600 whitespace-nowrap">
                        <StatusDot status={order.status} />{order.status}
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 hidden md:table-cell">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === order.id ? null : order.id)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {openMenu === order.id && (
                        <ContextMenu order={order} onClose={() => setOpenMenu(null)} onAction={handleMenuAction} isAdmin={isAdmin} />
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 text-sm">
                      No work orders in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Work Order Modal */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setForm(EMPTY_FORM) }} title="New Work Order" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Location</label>
            <input
              required
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Building A — Floor 2"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Issue Type</label>
            <input
              required
              value={form.issue_type}
              onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}
              placeholder="e.g. Pipe leak, Valve replacement"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Severity</label>
            <select
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue…"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Creating…' : 'Create Work Order'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setShowNew(false); setForm(EMPTY_FORM) }}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={selectedOrder?.issue_type ?? ''} size="md">
        {selectedOrder && (
          <div className="space-y-5">
            <div>
              <p className="text-lg font-semibold text-slate-800">{selectedOrder.issue_type}</p>
              <p className="text-sm text-slate-500 mt-1">{selectedOrder.location}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Source</p>
                <p className="text-sm font-semibold text-slate-700 capitalize">{selectedOrder.source}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Severity</p>
                <p className={`text-sm font-semibold ${selectedOrder.severity === 'High' ? 'text-red-600' : selectedOrder.severity === 'Medium' ? 'text-orange-600' : 'text-slate-600'}`}>
                  {selectedOrder.severity}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <p className="text-sm font-semibold text-slate-700">{selectedOrder.status}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Description</p>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedOrder.description}</p>
            </div>
            {selectedOrder.status !== 'Resolved' && selectedOrder.status !== 'Closed' && (
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleMarkComplete}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Mark Complete
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
