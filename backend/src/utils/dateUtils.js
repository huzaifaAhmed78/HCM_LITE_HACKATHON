// Dates are stored as 'YYYY-MM-DD' strings in the COMPANY timezone (Settings.timezone).
const safeTz = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return 'UTC'
  }
}

const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

export function localParts(date, tz = 'UTC') {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz(tz),
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  })
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]))
  const y = Number(p.year), m = Number(p.month), d = Number(p.day), h = Number(p.hour), min = Number(p.minute)
  return { y, m, d, h, min, date: `${p.year}-${p.month}-${p.day}`, minutes: h * 60 + min, weekday: WD[p.weekday] }
}

export const todayIn = (tz) => localParts(new Date(), tz).date

// 'YYYY-MM-DD' + 'HH:MM' in the company timezone -> real Date
export function localToDate(dateStr, hhmm, tz = 'UTC') {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, min)
  const lp = localParts(new Date(guess), tz)
  const asLocal = Date.UTC(lp.y, lp.m - 1, lp.d, lp.h, lp.min)
  return new Date(guess - (asLocal - guess))
}

export const hhmmToMinutes = (s) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

export const weekdayOf = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay()

export function eachDate(start, end) {
  const out = []
  const cur = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

export function monthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` }
}

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const rad = (x) => (x * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}
