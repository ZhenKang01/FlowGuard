import { workOrdersData } from '../../data/mockData';
import { FileText, MoreHorizontal } from 'lucide-react';

export default function WorkOrders() {
  const getPriorityBadge = (priority) => {
    const styles = {
      High: 'bg-red-50 text-red-700 border-red-100',
      Medium: 'bg-orange-50 text-orange-700 border-orange-100',
      Low: 'bg-slate-50 text-slate-700 border-slate-200'
    };
    return `text-xs font-medium px-2 py-1 rounded-md border ${styles[priority] || styles.Low}`;
  };

  const getStatusDot = (status) => {
    const colors = {
      'In Progress': 'bg-blue-500',
      'Pending': 'bg-orange-500',
      'Scheduled': 'bg-slate-300'
    };
    return <span className={`w-2 h-2 rounded-full mr-2 ${colors[status] || 'bg-slate-300'}`}></span>;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Recent Work Orders</h2>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          View All
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium">Task</th>
              <th className="p-4 font-medium hidden sm:table-cell">Assigned</th>
              <th className="p-4 font-medium">Priority</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {workOrdersData.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-semibold text-slate-800">{order.task}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{order.id} • Due {order.dueDate}</div>
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <span className="text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-medium">
                    {order.team}
                  </span>
                </td>
                <td className="p-4">
                  <span className={getPriorityBadge(order.priority)}>{order.priority}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center text-slate-600 whitespace-nowrap">
                    {getStatusDot(order.status)}
                    {order.status}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
