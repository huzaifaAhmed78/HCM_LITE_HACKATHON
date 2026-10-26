import { useState } from 'react'
import { api } from '../api.js'
import FaceCapture from '../components/FaceCapture.jsx'
import { Badge, Btn, Card, Err, Field, currentMonth, fmtHours, fmtTime, inputCls, useLoad } from '../components/bits.jsx'

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({})
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve({}),
      { timeout: 8000, enableHighAccuracy: true }
    )
  })
}

function Calendar({ days }) {
  const offset = new Date(`${days[0].date}T00:00:00Z`).getUTCDay()
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const color = { present: 'bg-teal-100', late: 'bg-amber-100', half_day: 'bg-orange-100', absent: 'bg-red-100', leave: 'bg-sky-100', holiday: 'bg-violet-100', weekend: 'bg-gray-100' }
  return (
    <div className="grid grid-cols-7 gap-1 text-center text-xs">
      {names.map((n) => <div key={n} className="py-1 font-medium text-ink/60">{n}</div>)}
      {Array.from({ length: offset }).map((_, i) => <div key={`o${i}`} />)}
      {days.map((d) => (
        <div key={d.date} title={d.holiday || d.status || ''} className={`rounded p-1.5 ${color[d.status] || 'bg-white border border-sand'}`}>
          <div className="font-medium">{Number(d.date.slice(8))}</div>
          <div className="truncate text-[10px] text-ink/70">{d.status === 'upcoming' || !d.status ? '' : d.status.replace('_', ' ')}</div>
        </div>
      ))}
    </div>
  )
}

export default function Attendance() {
  const [month, setMonth] = useState(currentMonth())
  const today = useLoad(() => api('/attendance/today'), [])
  const cal = useLoad(() => api(`/attendance/me?month=${month}`), [month])
  const corr = useLoad(() => api('/attendance/corrections'), [])
  const face = useLoad(() => api('/attendance/face/status'), [])
  const [camera, setCamera] = useState(null) // 'checkin' | 'checkout' | 'enroll'
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [form, setForm] = useState({ date: '', checkIn: '09:00', checkOut: '18:00', reason: '' })

  const act = async (fn) => {
    setBusy(true); setErr(null)
    try { await fn(); await Promise.all([today.reload(), cal.reload(), corr.reload()]) } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const doCheckIn = (descriptor) => act(async () => api('/attendance/check-in', { method: 'POST', body: { ...(await getPosition()), ...(descriptor ? { descriptor } : {}) } }))
  const doCheckOut = (descriptor) => act(() => api('/attendance/check-out', { method: 'POST', body: descriptor ? { descriptor } : {} }))
  const onFace = (descriptor) => {
    const mode = camera
    setCamera(null)
    if (mode === 'checkin') doCheckIn(descriptor)
    else if (mode === 'checkout') doCheckOut(descriptor)
    else act(async () => { await api('/attendance/face/enroll', { method: 'POST', body: { descriptor } }); await face.reload() })
  }
  const enrolled = face.data?.enrolled
  const submit = (e) => {
    e.preventDefault()
    act(async () => {
      const body = { date: form.date, checkIn: form.checkIn, reason: form.reason }
      if (form.checkOut) body.checkOut = form.checkOut
      await api('/attendance/corrections', { method: 'POST', body })
      setForm({ ...form, date: '', reason: '' })
    })
  }

  const rec = today.data?.record
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">My attendance</h1>
      <Err error={err} />
      <Card title="Today">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-sm">
            <div>Date: <b>{today.data?.date || '-'}</b></div>
            <div>In: <b>{fmtTime(rec?.checkIn)}</b> &nbsp; Out: <b>{fmtTime(rec?.checkOut)}</b> &nbsp; {rec && <Badge status={rec.status} />}</div>
            {rec?.checkOut && <div>Worked: <b>{fmtHours(rec.workedMinutes)}</b></div>}
          </div>
          <div className="ml-auto flex gap-2">
            <Btn disabled={busy || !!rec || !!camera} onClick={() => (enrolled ? setCamera('checkin') : doCheckIn())}>Check in{enrolled ? ' with face' : ''}</Btn>
            <Btn variant="ghost" disabled={busy || !rec || !!rec?.checkOut || !!camera} onClick={() => (enrolled ? setCamera('checkout') : doCheckOut())}>Check out</Btn>
          </div>
        </div>
      </Card>

      {camera && <FaceCapture mode={camera === 'enroll' ? 'enroll' : 'verify'} onDone={onFace} onCancel={() => setCamera(null)} />}
      {face.data && !enrolled && !camera && (
        <Card title="Face attendance">
          <p className="mb-3 text-sm text-ink/70">Register your face once. After that, check-in and check-out need a face scan.</p>
          <Btn disabled={busy} onClick={() => setCamera('enroll')}>Register my face</Btn>
        </Card>
      )}

      <Card title="Calendar" right={<input type="month" className="rounded-md border border-sand px-2 py-1 text-sm" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />}>
        <Err error={cal.error} />
        {cal.data && (
          <>
            <div className="mb-3 flex flex-wrap gap-3 text-sm">
              {Object.entries(cal.data.summary).map(([k, v]) => <span key={k}><Badge status={k} /> <b>{v}</b></span>)}
            </div>
            <Calendar days={cal.data.days} />
          </>
        )}
      </Card>

      <Card title="Request a correction">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
          <Field label="Date"><input required type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Check-in"><input required type="time" className={inputCls} value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></Field>
          <Field label="Check-out"><input type="time" className={inputCls} value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></Field>
          <Field label="Reason"><input required className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <div className="sm:col-span-4"><Btn disabled={busy}>Send request</Btn></div>
        </form>
      </Card>

      <Card title="My correction requests">
        <Err error={corr.error} />
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-ink/60"><th>Date</th><th>In</th><th>Out</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {(corr.data || []).map((c) => (
              <tr key={c._id} className="border-t border-sand"><td className="py-1.5">{c.date}</td><td>{c.checkIn}</td><td>{c.checkOut || '-'}</td><td>{c.reason}</td><td><Badge status={c.status} /></td></tr>
            ))}
            {corr.data?.length === 0 && <tr><td colSpan="5" className="py-3 text-ink/50">No requests yet</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

