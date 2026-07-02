/**
 * src/lib/flowguardApi.js
 *
 * Thin wrapper around the FlowGuard FastAPI service.
 *
 * Base URL is read from the Vite env var VITE_FLOWGUARD_API_URL.
 * If the var is absent it falls back to http://localhost:8000 so the
 * dev experience works with no configuration.
 *
 * Every function throws on error — callers are expected to catch and
 * set their own error state so the UI degrades gracefully when the
 * API is down.
 */

const BASE = (import.meta.env.VITE_FLOWGUARD_API_URL ?? 'https://flowguard-backend-w8ig.onrender.com')
  .replace(/\/$/, '')

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Score a 24-hour window against the LSTM model.
 *
 * @param {string} meterId   e.g. "meter_02"
 * @param {number[]} readings  exactly 24 L/hr values, oldest first
 * @returns {{ meter_id, anomaly: bool, score: number, threshold: number, n_readings: 24 }}
 */
export function scoreWindow(meterId, readings) {
  return request('/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meter_id: meterId, readings }),
  })
}

/**
 * Fetch alerts that have been routed through n8n and stored by FastAPI.
 * @returns {{ alerts: Array }}
 */
export function getAlerts() {
  return request('/alerts')
}

/**
 * Approve a pending-approval alert (human-in-the-loop confirmation).
 * @param {string} alertId
 */
export function approveAlert(alertId) {
  return request(`/alerts/${alertId}/approve`, { method: 'PATCH' })
}

/**
 * Send a chat message to the FlowGuard agent.
 * The LLM API key lives server-side only — this call never exposes it.
 *
 * @param {string} message
 * @param {string} userRole  RBAC role from AuthContext
 * @param {Array}  conversationHistory  [{role, content}, ...]
 * @returns {{ reply: string, intent: string, confidence: number }}
 */
export function sendChatMessage(message, userRole, conversationHistory) {
  return request('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      user_role: userRole,
      conversation_history: conversationHistory,
    }),
  })
}
