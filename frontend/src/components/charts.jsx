import { Children, cloneElement, useEffect, useState } from 'react'
import { cx } from './bits.jsx'

// Counts a number up once when it appears (skipped if the user prefers reduced motion).
function useCountUp(target, duration = 700) {
  const [n, setN] = useState(typeof target === 'number' ? 0 : target)
  useEffect(() => {
    if (typeof target !== 'number' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(target)
      return undefined
    }
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      setN(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return n
}

// Handles 12, "12%", "Rs 1,200". Anything else ("Unlimited", "-") is shown as is.
const PARSE = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/

function AnimatedValue({ value }) {
  const m = typeof value === 'string' ? PARSE.exec(value) : null
  const target = typeof value === 'number' ? value : m ? Number(m[2].replace(/,/g, '')) : null
  const decimals = m ? (m[2].split('.')[1] || '').length : typeof value === 'number' && !Number.isInteger(value) ? 2 : 0
  const n = useCountUp(target)
  if (target == null) return <>{value ?? '-'}</>
  const text = Number(n).toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return <>{m ? m[1] : ''}{text}{m ? m[3] : ''}</>
}

export const Kpi = ({ label, value, hint, tone, featured }) => (
  <div
    className={cx(
      'rounded-2xl border p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift',
      featured ? 'border-pine-dark bg-pine-dark text-white' : 'border-sand bg-white'
    )}
  >
    <div className={cx('text-sm', featured ? 'text-white/80' : 'text-ink/60')}>{label}</div>
    <div className={cx('mt-3 font-display text-3xl font-bold tabular-nums', !featured && tone)}>
      <AnimatedValue value={value} />
    </div>
    {hint && <div className={cx('mt-1 text-xs', featured ? 'text-white/70' : 'text-ink/50')}>{hint}</div>}
  </div>
)

// The first card in each row is the dark green one.
export const Kpis = ({ children }) => (
  <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
    {Children.toArray(children).map((c, i) => (i === 0 ? cloneElement(c, { featured: true }) : c))}
  </div>
)

// Horizontal bars: rows = [{ label, value, note? }]
export function BarRows({ rows, format = (v) => v, empty = 'No data in this range' }) {
  if (!rows?.length) return <p className="py-4 text-sm text-gray-400">{empty}</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-medium">{format(r.value)}{r.note && <span className="ml-1 text-xs font-normal text-gray-400">{r.note}</span>}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pine to-mint"
              style={{ width: `${(r.value / max) * 100}%`, transformOrigin: 'left', animation: `grow-x 0.6s ease-out ${i * 60}ms both` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

const SEG = [['present', 'bg-green-500', 'Present'], ['late', 'bg-amber-500', 'Late'], ['half_day', 'bg-orange-400', 'Half day'], ['leave', 'bg-blue-400', 'On leave'], ['absent', 'bg-red-500', 'Absent']]

// Stacked daily attendance bars
export function TrendChart({ data }) {
  if (!data?.length) return <p className="py-4 text-sm text-gray-400">No working days in this range yet</p>
  const max = Math.max(...data.map((d) => SEG.reduce((a, [k]) => a + (d[k] || 0), 0)), 1)
  return (
    <div>
      <div className="flex h-40 items-end gap-1 overflow-x-auto">
        {data.map((d, i) => (
          <div
            key={d.date}
            className="flex min-w-[14px] flex-1 flex-col-reverse overflow-hidden rounded-t-md"
            style={{ transformOrigin: 'bottom', animation: `grow-y 0.55s ease-out ${Math.min(i, 30) * 25}ms both` }}
            title={`${d.date}: ${SEG.map(([k, , l]) => `${l} ${d[k] || 0}`).join(', ')}`}
          >
            {SEG.map(([k, cls]) => d[k] > 0 && <div key={k} className={cls} style={{ height: `${(d[k] / max) * 160}px` }} />)}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-400"><span>{data[0].date}</span><span>{data[data.length - 1].date}</span></div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
        {SEG.map(([k, cls, l]) => <span key={k} className="flex items-center gap-1"><i className={cx('inline-block h-2.5 w-2.5 rounded-sm', cls)} />{l}</span>)}
      </div>
    </div>
  )
}
