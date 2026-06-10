import { FileBarChart, Download } from 'lucide-react';

export default function ReportsPreview() {
  const reports = [
    { title: "Monthly Water Usage", date: "Generated 2 days ago" },
    { title: "Sanitation Compliance", date: "Generated last week" },
    { title: "Leak Incident Summary", date: "Generated yesterday" }
  ];

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-md text-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">Quick Reports</h2>
        <FileBarChart className="w-5 h-5 text-blue-200" />
      </div>

      <div className="space-y-3">
        {reports.map((report, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
            <div>
              <p className="text-sm font-medium">{report.title}</p>
              <p className="text-xs text-blue-200 mt-0.5">{report.date}</p>
            </div>
            <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/30 transition-colors">
              <Download className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-5 py-2.5 bg-white text-blue-700 font-semibold text-sm rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
        View Report Archive
      </button>
    </div>
  );
}
