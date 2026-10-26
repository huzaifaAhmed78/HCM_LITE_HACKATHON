import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function Notifications() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ unread: 0, items: [] })
  const navigate = useNavigate()
  const ref = useRef(null)
  const load = useCallback(async () => { try { setData(await api('/notifications')) } catch { /* ignore, bell is optional */ } }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const go = async (n) => {
    if (!n.read) await api(`/notifications/${n.id}/read`, { method: 'PATCH', body: {} }).catch(() => {})
    setOpen(false)
    load()
    if (n.link) navigate(n.link)
  }
  const readAll = async () => { await api('/notifications/read-all', { method: 'PATCH', body: {} }).catch(() => {}); load() }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); load() }}
        className="relative grid h-11 w-11 place-items-center rounded-xl border border-sand bg-white text-ink/70 transition-colors hover:bg-paper"
        aria-label={data.unread > 0 ? `Notifications, ${data.unread} unread` : 'Notifications'}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0" />
        </svg>
        {data.unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-coral px-1 text-[11px] font-semibold leading-[18px] text-white">{data.unread}</span>
        )}
      </button>
      {open && (
        <div className="anim-pop absolute right-0 z-30 mt-2 w-80 max-w-[85vw] overflow-hidden rounded-2xl border border-sand bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-sand px-4 py-2.5 text-xs">
            <span className="text-sm font-semibold">Notifications</span>
            {data.unread > 0 && <button className="text-pine underline" onClick={readAll}>Mark all read</button>}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {data.items.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink/50">Nothing yet</li>}
            {data.items.map((n) => (
              <li key={n.id}>
                <button onClick={() => go(n)} className={`block w-full border-b border-sand px-4 py-2.5 text-left text-sm hover:bg-paper ${n.read ? '' : 'bg-pine/5'}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <i className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" />}
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-ink/70">{n.message}</div>
                      <div className="mt-0.5 text-[11px] text-ink/40">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
