import { useCallback, useEffect, useState } from 'react'

export const cx = (...a) => a.filter(Boolean).join(' ')

export const STATUS = {
  present: { label: 'Present', cls: 'bg-teal-50 text-teal-800' },
  late: { label: 'Late', cls: 'bg-amber-50 text-amber-800' },
  half_day: { label: 'Half day', cls: 'bg-orange-50 text-orange-800' },
  absent: { label: 'Absent', cls: 'bg-red-50 text-red-700' },
  leave: { label: 'On leave', cls: 'bg-sky-50 text-sky-800' },
  holiday: { label: 'Holiday', cls: 'bg-violet-50 text-violet-800' },
  weekend: { label: 'Weekend', cls: 'bg-gray-100 text-ink/60' },
  upcoming: { label: 'Not yet', cls: 'bg-white text-ink/50' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Approved', cls: 'bg-teal-50 text-teal-800' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-ink/60' },
}

export function Badge({ status }) {
  const s = STATUS[status]
  if (!s) return <span className="text-gray-300">-</span>
  return <span className={cx('inline-block rounded-md px-2 py-0.5 text-xs font-medium', s.cls)}>{s.label}</span>
}

export function Card({ title, right, className, children }) {
  return (
    <section className={cx(!/(^|\s)mb-/.test(className || '') && 'mb-5', 'rounded-2xl border border-sand bg-white p-5 shadow-card', className)}>
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function Btn({ variant = 'primary', className, ...p }) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition duration-150 active:scale-[0.98] disabled:opacity-50'
  const v = {
    primary: 'bg-pine-dark text-white hover:bg-pine',
    ghost: 'border border-sand bg-white hover:bg-paper',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant]
  return <button className={cx(base, v, className)} {...p} />
}

export const inputCls =
  'w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm transition-colors hover:border-pine/50 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20'

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-ink/60">{label}</span>
      {children}
    </label>
  )
}

export function Err({ error }) {
  if (!error) return null
  return (
    <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error.message}
      {error.errors?.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {error.errors.map((e, i) => <li key={i}>{e.field ? `${e.field}: ` : ''}{e.message}</li>)}
        </ul>
      )}
    </div>
  )
}

// Grey shimmering placeholder shown while data loads.
export const Skeleton = ({ className }) => <div className={cx('skeleton', className)} />

export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-')
export const fmtHours = (m) => (m ? `${Math.floor(m / 60)}h ${m % 60}m` : '-')
export const currentMonth = () => new Date().toISOString().slice(0, 7)

// Loads data on mount and whenever deps change. reload() refreshes.
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const run = useCallback(async () => {
    setLoading(true)
    try { setData(await fn()); setError(null) } catch (e) { setError(e) } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { run() }, [run])
  return { data, error, loading, reload: run, setError }
}
