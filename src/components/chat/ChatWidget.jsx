/**
 * ChatWidget.jsx
 * ==============
 * Floating chat panel that wires the React dashboard to the FlowGuard agent
 * (FastAPI /chat).  Replaces the originally-planned Botpress integration with
 * a custom agent for tighter coupling with /alerts and the LSTM scorer.
 *
 * Design decisions:
 * - Fixed bottom-right — doesn't interfere with the main layout.
 * - Conversation history is kept in component state and sent on every request
 *   so the server has context for multi-turn flows (e.g. work-order collection).
 * - Intent badge: the router's decision is shown subtly next to each reply.
 *   This makes the agent's routing visible for the demo/report.
 * - ORDER_DRAFT marker in bot messages is rendered as a styled card instead of
 *   raw text — cleaner UX and clearly shows the confirmation step.
 * - If /chat is unreachable the widget degrades gracefully (shows error inline,
 *   never crashes the rest of the dashboard).
 */

import { useState, useRef, useEffect } from 'react'
import {
  MessageCircle, X, Send, Loader2, Bot, User,
  AlertTriangle, FileText, Activity, MessageSquare,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { sendChatMessage } from '../../lib/flowguardApi'

// ── Intent badge config ────────────────────────────────────────────────────────
const INTENT_META = {
  protocol_question: { label: 'Protocol Q&A',  Icon: FileText,  color: 'bg-violet-100 text-violet-700' },
  log_issue:         { label: 'Work Order',     Icon: AlertTriangle, color: 'bg-orange-100 text-orange-700' },
  query_status:      { label: 'Live Status',    Icon: Activity,  color: 'bg-blue-100 text-blue-700'   },
  smalltalk:         { label: 'General',        Icon: MessageSquare, color: 'bg-slate-100 text-slate-500' },
  error:             { label: 'Error',          Icon: AlertTriangle, color: 'bg-red-100 text-red-600'  },
}

function IntentBadge({ intent }) {
  const meta = INTENT_META[intent]
  if (!meta) return null
  const { label, Icon, color } = meta
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color} mt-1`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}

// ── ORDER_DRAFT card renderer ──────────────────────────────────────────────────
// The server embeds [ORDER_DRAFT: {...}] in the message so it survives in
// conversation history for the next turn.  We render it as a styled card.
function parseOrderDraft(text) {
  const match = text.match(/\[ORDER_DRAFT:\s*(\{.*?\})\]/s)
  if (!match) return { cleanText: text, draft: null }
  try {
    return {
      cleanText: text.replace(/\[ORDER_DRAFT:\s*\{.*?\}\]/s, '').trim(),
      draft: JSON.parse(match[1]),
    }
  } catch {
    return { cleanText: text, draft: null }
  }
}

function OrderDraftCard({ draft }) {
  if (!draft) return null
  const sev = draft.severity?.toLowerCase()
  const sevColor = sev === 'high' ? 'text-red-600' : sev === 'medium' ? 'text-orange-500' : 'text-yellow-600'
  return (
    <div className="mt-2 border border-slate-200 rounded-xl bg-slate-50 p-3 text-xs">
      <p className="font-semibold text-slate-600 mb-1.5 uppercase tracking-wide text-[10px]">Order Draft</p>
      <div className="space-y-0.5 text-slate-700">
        <p><span className="text-slate-400">Location:</span> {draft.location}</p>
        <p><span className="text-slate-400">Issue:</span> {draft.issue_type}</p>
        <p><span className={`font-semibold ${sevColor}`}>{draft.severity}</span> severity</p>
        <p><span className="text-slate-400">Desc:</span> {draft.description}</p>
      </div>
    </div>
  )
}

// ── Render markdown-lite bold (**text**) ───────────────────────────────────────
function renderText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

// ── Single message bubble ─────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  const { cleanText, draft } = parseOrderDraft(msg.content)

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${isUser ? 'bg-blue-600' : 'bg-slate-200'}`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot  className="w-3.5 h-3.5 text-slate-600" />
        }
      </div>

      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
        }`}>
          {renderText(cleanText)}
          {!isUser && draft && <OrderDraftCard draft={draft} />}
        </div>
        {!isUser && msg.intent && <IntentBadge intent={msg.intent} />}
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────
const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm the FlowGuard assistant. I can:\n- Answer maintenance protocol questions\n- Help you log a work order\n- Check live leak alerts\n\nWhat do you need?",
  intent: 'smalltalk',
}

export default function ChatWidget() {
  const { role: userRole } = useAuth()
  const [open,    setOpen]    = useState(false)
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([WELCOME])

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Focus input when panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Build the history array that the server expects (exclude the welcome message
  // and any non-standard fields; keep role + content only)
  const serverHistory = () =>
    messages
      .filter(m => m !== WELCOME)
      .map(({ role, content }) => ({ role, content }))

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await sendChatMessage(text, userRole ?? 'viewer', serverHistory())
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: res.reply, intent: res.intent },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'The chat service is currently unavailable. Please try again later or contact your supervisor directly.',
          intent: 'error',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="font-semibold text-sm">FlowGuard Assistant</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                {userRole ?? 'viewer'}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 bg-slate-50">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-slate-100 bg-white shrink-0">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about protocols, alerts, or log an issue…"
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-snug max-h-24 overflow-y-auto"
              style={{ minHeight: '38px' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="shrink-0 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Send"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating action button ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-4 right-4 z-50 w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? 'bg-slate-700 hover:bg-slate-800'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
        }`}
        style={{ width: '52px', height: '52px' }}
        aria-label="Toggle FlowGuard chat"
      >
        {open
          ? <X             className="w-5 h-5 text-white" />
          : <MessageCircle className="w-5 h-5 text-white" />
        }
      </button>
    </>
  )
}
