import { useState } from 'react'
import { reportsArchiveData } from '../data/mockData'
import { FileBarChart, Download } from 'lucide-react'
import Toast from '../components/ui/Toast'

const TYPES = ['All', 'Usage', 'Compliance', 'Incidents', 'Quarterly', 'Annual']

const typeColors = {
  Usage:      'bg-blue-50 text-blue-700',
  Compliance: 'bg-violet-50 text-violet-700',
  Incidents:  'bg-red-50 text-red-700',
  Quarterly:  'bg-amber-50 text-amber-700',
  Annual:     'bg-emerald-50 text-emerald-700',
}

export default function ReportsPage() {
  const [activeType, setActiveType] = useState('All')
  const [toast, setToast] = useState(null)
  const [downloading, setDownloading] = useState(null)

  const filtered = reportsArchiveData.filter(r => activeType === 'All' || r.type === activeType)

  const handleDownload = (report) => {
    setDownloading(report.id)
    setTimeout(() => {
      setDownloading(null)
      setToast(`${report.title} (${report.period}) downloaded`)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 mt-1">Download and manage facility reports</p>
        </div>
        <button
          onClick={() => setToast('Generating new report — this may take a moment')}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <FileBarChart className="w-4 h-4" />
          <span>Generate Report</span>
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeType === type
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(report => (
          <div key={report.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${typeColors[report.type] ?? 'bg-slate-50 text-slate-600'}`}>
                <FileBarChart className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeColors[report.type] ?? 'bg-slate-50 text-slate-600'}`}>
                {report.type}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">{report.title}</h3>
            <p className="text-xs text-slate-500">{report.period}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400">{report.generatedDate}</p>
                <p className="text-xs text-slate-400 mt-0.5">{report.size}</p>
              </div>
              <button
                onClick={() => handleDownload(report)}
                disabled={downloading === report.id}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  downloading === report.id
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === report.id ? 'Downloading...' : 'Download'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
