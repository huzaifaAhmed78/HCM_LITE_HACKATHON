import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { cx } from './bits.jsx'

// Usage: const toast = useToast(); toast.success('Saved'); toast.error(err.message)
const Ctx = createContext({ success: () => {}, error: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), [])
  const push = useCallback(
    (kind, message) => {
      const id = ++nextId.current
      setItems((list) => [...list.slice(-3), { id, kind, message }])
      setTimeout(() => dismiss(id), kind === 'error' ? 5500 : 3200)
    },
    [dismiss]
  )
  const toast = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push])

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cx(
              'anim-toast pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-lift',
              t.kind === 'error' ? 'border-red-200' : 'border-pine/20'
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white',
                t.kind === 'error' ? 'bg-red-600' : 'bg-pine'
              )}
            >
              {t.kind === 'error' ? '!' : '\u2713'}
            </span>
            <span className="min-w-0 flex-1 break-words">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-mr-1 rounded px-1 text-lg leading-none text-ink/40 hover:text-ink">
              &times;
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
