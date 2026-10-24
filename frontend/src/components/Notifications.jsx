import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function Notifications() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ unread: 0, items: [] })
  const navigate = useNavigate()
  const load = useCallback(async () => { try { setData(await api('/notifications')) } catch { /* ignore, bell is optional */ } }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const go = async (n) => {
    if (!n.read) await api(`/notifications/${n.id}/read`, { method: 'PATCH', body: {} }).catch(() => {})
    setOpen(false)
    load()
    if (n.link) navigate(n.link)
  }
  const readAll = async () => { await api('/notifications/read-all', { method: 'PATCH', body: {} }).catch(() => {}); load() }

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); load() }} className="relative rounded px-2 py-1 hover:bg-sand/60" aria-label="Notifications">
        Notifications
        {data.unread > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[85vw] rounded-lg border border-sand bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-sand px-3 py-2 text-xs">
            <span className="font-medium">Notifications</span>
            {data.unread > 0 && <button className="underline" onClick={readAll}>Mark all read</button>}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {data.items.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-400">Nothing yet</li>}
            {data.items.map((n) => (
              <li key={n.id}>
                <button onClick={() => go(n)} className={`block w-full border-b border-sand px-3 py-2 text-left text-sm hover:bg-sand/40 ${n.read ? '' : 'bg-amber/10'}`}>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-gray-600">{n.message}</div>
                  <div className="text-[11px] text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
