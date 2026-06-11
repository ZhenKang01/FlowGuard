import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl">
      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
