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
export async function sendChatMessage(message, userRole, conversationHistory) {
  // Use the local proxy to bypass CORS and SSL certificate errors
  const res = await fetch('/chat-api/webhook/c32956ef-f1e9-4cd8-a2e3-35ea76acae9a/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatInput: message,          // n8n AI node typically expects chatInput
      sessionId: "user-session-1", // n8n AI node typically expects sessionId for memory
      message: message,            // Original fields just in case
      user_role: userRole,
      conversation_history: conversationHistory,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  
  // n8n AI response is usually in `data.output`. Fallback to `reply` or the raw string.
  return { 
    reply: data.output || data.reply || (typeof data === 'string' ? data : JSON.stringify(data)),
    intent: data.intent || 'smalltalk'
  };
}
