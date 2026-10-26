import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { Btn, inputCls } from './bits.jsx'

const HINTS = {
  employee: ['How many sick leaves do I have left this year?', 'Can I take leave on a public holiday?'],
  hr: ['Who is on leave today?', 'Who came late most often this month?', 'What is this month’s attendance rate?'],
  admin: ['How many active employees do we have?', 'What is the payroll summary for this month?'],
}

// Floating assistant. Opens from the button or from anywhere via window.dispatchEvent(new Event('ai:open')).
export default function AiChat({ role }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef(null)

  useEffect(() => {
    const on = () => setOpen(true)
    window.addEventListener('ai:open', on)
    return () => window.removeEventListener('ai:open', on)
  }, [])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  const send = async (q) => {
    const message = (q ?? text).trim()
    if (!message || busy) return
    setText('')
    const history = msgs.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }))
    setMsgs((m) => [...m, { role: 'user', content: message }])
    setBusy(true)
    try {
      const res = await api('/ai/chat', { method: 'POST', body: { message, history } })
      setMsgs((m) => [...m, { role: 'assistant', content: res.answer }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: e.message, error: true }])
    } finally { setBusy(false) }
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 rounded-full bg-pine-dark px-4 py-3 text-sm font-medium text-white shadow-lg hover:opacity-90">Ask assistant</button>
  }
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 flex max-h-[80vh] flex-col rounded-lg border border-sand bg-white shadow-xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96">
      <div className="flex items-center justify-between border-b border-sand px-4 py-2">
        <div><div className="font-display font-bold">Assistant</div><div className="text-[11px] text-ink/50">AI-generated. Answers come from your company data.</div></div>
        <button onClick={() => setOpen(false)} aria-label="Close" className="rounded px-2 text-xl leading-none hover:bg-sand/60">×</button>
      </div>
      <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {msgs.length === 0 && (
          <div>
            <p className="text-ink/60">Ask about your data or company policy. You can write in English or Roman Urdu.</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {(HINTS[role] || []).map((h) => <button key={h} onClick={() => send(h)} className="rounded-md border border-sand px-2 py-1.5 text-left hover:bg-sand/50">{h}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-left ${m.role === 'user' ? 'bg-pine-dark text-white' : m.error ? 'bg-red-50 text-red-800' : 'bg-sand/60'}`}>{m.content}</div>
            {m.role === 'assistant' && !m.error && <div className="mt-0.5 text-[10px] text-ink/50">AI-generated</div>}
          </div>
        ))}
        {busy && <div className="text-xs text-ink/50">Thinking...</div>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-sand p-3" onSubmit={(e) => { e.preventDefault(); send() }}>
        <input className={inputCls} placeholder="Type your question" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
        <Btn disabled={busy || !text.trim()}>Send</Btn>
      </form>
    </div>
  )
}

