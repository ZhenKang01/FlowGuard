import { useState } from 'react'
import { FileBarChart, Download } from 'lucide-react'
import Toast from '../ui/Toast'

const reports = [
  { title: 'Monthly Water Usage',   date: 'Generated 2 days ago' },
  { title: 'Sanitation Compliance', date: 'Generated last week'  },
  { title: 'Leak Incident Summary', date: 'Generated yesterday'  },
]

export default function ReportsPreview({ onNavigate }) {
  const [toast, setToast] = useState(null)
  const [downloading, setDownloading] = useState(null)

  const handleDownload = (title) => {
    setDownloading(title)
    setTimeout(() => {
      setDownloading(null)
      setToast(`${title} downloaded`)
    }, 900)
  }

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-md text-white">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">Quick Reports</h2>
        <FileBarChart className="w-5 h-5 text-blue-200" />
      </div>

      <div className="space-y-3">
        {reports.map(report => (
          <button
            key={report.title}
            onClick={() => handleDownload(report.title)}
            disabled={downloading === report.title}
            className="w-full flex justify-between items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors group text-left disabled:opacity-60"
          >
            <div>
              <p className="text-sm font-medium">{report.title}</p>
              <p className="text-xs text-blue-200 mt-0.5">{report.date}</p>
            </div>
            <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/30 transition-colors shrink-0">
              <Download className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => onNavigate('reports')}
        className="w-full mt-5 py-2.5 bg-white text-blue-700 font-semibold text-sm rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
      >
        View Report Archive
      </button>
    </div>
  )
}
