import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchOpenAlertsCount, fetchOpenWorkOrdersCount } from '../lib/supabaseQueries'

export function useDashboardKPIs() {
  const [openAlerts,     setOpenAlerts]     = useState(null)
  const [openWorkOrders, setOpenWorkOrders] = useState(null)

  const refresh = useCallback(async () => {
    const [{ count: a }, { count: w }] = await Promise.all([
      fetchOpenAlertsCount(),
      fetchOpenWorkOrdersCount(),
    ])
    if (a !== null) setOpenAlerts(a)
    if (w !== null) setOpenWorkOrders(w)
  }, [])

  useEffect(() => {
    refresh()
    const ch1 = supabase.channel('kpi-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, refresh)
      .subscribe()
    const ch2 = supabase.channel('kpi-work-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [refresh])

  return { openAlerts, openWorkOrders }
}
