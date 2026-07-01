import { supabase } from './supabase'

// ── Alerts ────────────────────────────────────────────────────────────────────

export function fetchAlerts({ limit = 50 } = {}) {
  return supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
}

export function fetchOpenAlertsCount() {
  return supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'pending_approval'])
}

export function approveAlertInDB(alertId) {
  return supabase
    .from('alerts')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', alertId)
}

export function resolveAlertInDB(alertId) {
  return supabase
    .from('alerts')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', alertId)
}

// ── Work Orders ───────────────────────────────────────────────────────────────

export function fetchWorkOrders({ limit = 100 } = {}) {
  return supabase
    .from('work_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
}

export function fetchOpenWorkOrdersCount() {
  return supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['Open', 'In Progress'])
}

export function createWorkOrder(payload) {
  return supabase
    .from('work_orders')
    .insert([payload])
    .select()
    .single()
}

export function updateWorkOrderStatus(id, status) {
  return supabase
    .from('work_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
}
