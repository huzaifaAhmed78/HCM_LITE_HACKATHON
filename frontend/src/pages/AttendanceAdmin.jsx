import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import FaceCapture from '../components/FaceCapture.jsx'
import { Badge, Btn, Card, Err, fmtHours, fmtTime, useLoad } from '../components/bits.jsx'

function Board() {
  const [date, setDate] = useState('')
  const { data, error } = useLoad(() => api(`/attendance/board${date ? `?date=${date}` : ''}`), [date])
  return (
    <Card title={`Daily board${data ? ` - ${data.date}` : ''}`} right={<input type="date" className="rounded-md border border-sand px-2 py-1 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />}>
      <Err error={error} />
      {data?.holiday && <div className="mb-2 text-sm text-purple-700">Holiday: {data.holiday}</div>}
      {data && (
        <>
          <div className="mb-3 flex flex-wrap gap-3 text-sm">
            {Object.entries(data.summary).map(([k, v]) => <span key={k}>{k === 'not_yet' ? 'Not yet' : <Badge status={k} />} <b>{v}</b></span>)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500"><th>Employee</th><th>Department</th><th>In</th><th>Out</th><th>Worked</th><th>Status</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.employeeId} className="border-t border-sand">
                    <td className="py-1.5"><Link className="hover:underline" to={`/employees/${r.employeeId}`}>{r.name}</Link> <span className="text-xs text-gray-400">{r.employeeCode}</span></td>
                    <td>{r.department}</td><td>{fmtTime(r.checkIn)}</td><td>{fmtTime(r.checkOut)}</td><td>{fmtHours(r.workedMinutes)}</td><td><Badge status={r.status} /></td>
                  </tr>
                ))}
                {data.rows.length === 0 && <tr><td colSpan="6" className="py-3 text-gray-400">No active employees</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}

function FaceEnroll() {
  const { data, error } = useLoad(() => api('/employees?limit=50&status=active'), [])
  const [id, setId] = useState('')
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const emps = data?.items || []
  const pick = id || emps[0]?.id || emps[0]?._id || ''
  const done = async (descriptor) => {
    setOpen(false); setErr(null); setMsg(null)
    try { await api(`/attendance/face/enroll/${pick}`, { method: 'POST', body: { descriptor } }); setMsg('Face registered.') } catch (e) { setErr(e) }
  }
  return (
    <Card title="Face enrollment">
      <Err error={error || err} />
      {msg && <div className="mb-3 text-sm text-green-700">{msg}</div>}
      {open ? <FaceCapture mode="enroll" onDone={done} onCancel={() => setOpen(false)} /> : (
        <div className="flex flex-wrap items-end gap-3">
          <select className="rounded-md border border-sand px-2 py-1.5 text-sm" value={pick} onChange={(e) => setId(e.target.value)}>
            {emps.map((e) => <option key={e.id || e._id} value={e.id || e._id}>{e.name} ({e.employeeCode})</option>)}
          </select>
          <Btn disabled={!pick} onClick={() => setOpen(true)}>Register or replace face</Btn>
        </div>
      )}
    </Card>
  )
}

function Corrections() {
  const { user } = useAuth()
  const [status, setStatus] = useState('pending')
  const { data, error, reload } = useLoad(() => api(`/attendance/corrections?status=${status}`), [status])
  const [err, setErr] = useState(null)
  const decide = async (id, what) => {
    setErr(null)
    try { await api(`/attendance/corrections/${id}/${what}`, { method: 'PATCH', body: {} }); reload() } catch (e) { setErr(e) }
  }
  return (
    <Card title="Correction requests" right={
      <select className="rounded-md border border-sand px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
      </select>}>
      <Err error={error || err} />
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-gray-500"><th>Employee</th><th>Date</th><th>In</th><th>Out</th><th>Reason</th><th /></tr></thead>
        <tbody>
          {(data || []).map((c) => (
            <tr key={c._id} className="border-t border-sand">
              <td className="py-1.5">{c.employeeId?.name} <span className="text-xs text-gray-400">{c.employeeId?.employeeCode}</span></td>
              <td>{c.date}</td><td>{c.checkIn}</td><td>{c.checkOut || '-'}</td><td>{c.reason}</td>
              <td className="whitespace-nowrap text-right">
                {c.status === 'pending' && user.role === 'hr' ? (
                  <><Btn onClick={() => decide(c._id, 'approve')}>Approve</Btn> <Btn variant="danger" onClick={() => decide(c._id, 'reject')}>Reject</Btn></>
                ) : <Badge status={c.status} />}
              </td>
            </tr>
          ))}
          {data?.length === 0 && <tr><td colSpan="6" className="py-3 text-gray-400">Nothing here</td></tr>}
        </tbody>
      </table>
    </Card>
  )
}

export default function AttendanceAdmin() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Attendance</h1>
      <Board />
      {user.role === 'hr' && <FaceEnroll />}
      <Corrections />
    </div>
  )
}
