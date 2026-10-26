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

// The number shrinks to fit the card: font size = card width / (characters x 0.8), never bigger than 1.875rem.
// "cqw" is 1% of the card's own width, so long values like "Rs 11,334,587" no longer spill out of the box.
export function Kpi({ label, value, hint, tone, featured }) {
  const chars = Math.max(String(value ?? '-').length, 1)
  return (
    <div
      style={{ containerType: 'inline-size' }}
      className={cx(
        'relative overflow-hidden rounded-2xl border p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        featured ? 'border-pine-dark bg-gradient-to-br from-pine-dark to-pine text-white' : 'border-sand bg-white'
      )}
    >
      {featured && <i className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" aria-hidden="true" />}
      <div className={cx('text-sm', featured ? 'text-white/80' : 'text-ink/60')}>{label}</div>
      <div
        className={cx('mt-3 whitespace-nowrap font-display font-bold tabular-nums', !featured && tone)}
        style={{
  fontSize: '18px',
  lineHeight: 1,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
}}
      >
        <AnimatedValue value={value} />
      </div>
      {hint && <div className={cx('mt-1.5 text-xs', featured ? 'text-white/70' : 'text-ink/50')}>{hint}</div>}
    </div>
  )
}

// The first card in each row is the dark teal one.
export const Kpis = ({ children }) => (
  <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
    {Children.toArray(children).map((c, i) => (i === 0 ? cloneElement(c, { featured: true }) : c))}
  </div>
)

// Horizontal bars: rows = [{ label, value, note? }]
export function BarRows({ rows, format = (v) => v, empty = 'No data in this range' }) {
  if (!rows?.length) return <p className="py-4 text-sm text-ink/50">{empty}</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-medium">{format(r.value)}{r.note && <span className="ml-1 text-xs font-normal text-ink/50">{r.note}</span>}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper">
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

const SEG = [['present', 'bg-teal-600', 'Present'], ['late', 'bg-amber-400', 'Late'], ['half_day', 'bg-orange-300', 'Half day'], ['leave', 'bg-sky-400', 'On leave'], ['absent', 'bg-coral', 'Absent']]

// Stacked daily attendance bars
export function TrendChart({ data }) {
  if (!data?.length) return <p className="py-4 text-sm text-ink/50">No working days in this range yet</p>
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
      <div className="mt-1 flex justify-between text-[10px] text-ink/50"><span>{data[0].date}</span><span>{data[data.length - 1].date}</span></div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink/70">
        {SEG.map(([k, cls, l]) => <span key={k} className="flex items-center gap-1"><i className={cx('inline-block h-2.5 w-2.5 rounded-sm', cls)} />{l}</span>)}
      </div>
    </div>
  )
}


// Heatmap: one row per week, one column per weekday. Colour = share of expected people who were in
// (present + late + half day) on that day. Built from the same daily trend data as TrendChart.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HEAT = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4']
const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const dayIndex = (d) => (d.getDay() + 6) % 7
const weekLabel = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' })

function heatLevel(share) {
  if (share >= 0.9) return 4
  if (share >= 0.75) return 3
  if (share >= 0.5) return 2
  return 1
}

export function Heatmap({ data, weeks = 8 }) {
  if (!data?.length) return <p className="py-4 text-sm text-ink/50">No working days in this range yet</p>

  const byDate = new Map()
  for (const d of data) {
    const inCount = (d.present || 0) + (d.late || 0) + (d.half_day || 0)
    const total = inCount + (d.leave || 0) + (d.absent || 0)
    byDate.set(d.date, total > 0 ? { share: inCount / total, inCount, total } : null)
  }

  // Group days into weeks that start on Monday
  const rows = []
  for (const d of data) {
    const day = parseDay(d.date)
    const start = new Date(day)
    start.setDate(day.getDate() - dayIndex(day))
    const key = start.toDateString()
    let row = rows.find((r) => r.key === key)
    if (!row) { row = { key, start, cells: Array(7).fill(null) }; rows.push(row) }
    row.cells[dayIndex(day)] = { date: d.date, info: byDate.get(d.date) }
  }
  const shown = rows.slice(-weeks)

  return (
    <div>
      <div className="grid grid-cols-[3.2rem_repeat(7,1fr)] items-center gap-1.5 text-[11px] text-ink/50">
        <span />
        {WEEKDAYS.map((w) => <span key={w} className="text-center">{w}</span>)}
        {shown.map((r) => (
          <div key={r.key} className="contents">
            <span className="pr-1 text-right">{weekLabel(r.start)}</span>
            {r.cells.map((c, i) => {
              if (!c) return <i key={i} className="aspect-[4/3] rounded-md bg-paper" />
              if (!c.info) return <i key={i} className="aspect-[4/3] rounded-md border border-dashed border-sand" title={`${c.date}: no data`} />
              const pct = Math.round(c.info.share * 100)
              return (
                <i
                  key={i}
                  className={cx('aspect-[4/3] rounded-md', HEAT[heatLevel(c.info.share)])}
                  style={{ animation: `cell-in 0.35s ease-out ${(i + shown.indexOf(r) * 7) * 12}ms both` }}
                  title={`${c.date}: ${pct}% in (${c.info.inCount} of ${c.info.total})`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-ink/50">
        <span>Lower</span>
        {HEAT.slice(1).map((c) => <i key={c} className={cx('h-3 w-3 rounded-sm', c)} />)}
        <span>Higher</span>
      </div>
    </div>
  )
}
