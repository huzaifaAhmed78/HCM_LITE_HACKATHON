import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Badge, Btn, Card, Err, useLoad } from '../components/bits.jsx'

export default function LeaveInbox() {
  const { user } = useAuth()
  const [status, setStatus] = useState('pending')
  const { data, error, reload } = useLoad(() => api(`/leaves?status=${status}`), [status])
  const [err, setErr] = useState(null)

  const decide = async (id, what) => {
    setErr(null)
    const note = window.prompt(what === 'approve' ? 'Comment for the employee (optional)' : 'Reason for rejecting')
    if (note === null) return
    if (what === 'reject' && !note.trim()) { setErr({ message: 'Please give a reason when rejecting.' }); return }
    try { await api(`/leaves/${id}/${what}`, { method: 'PATCH', body: { note } }); reload() } catch (e) { setErr(e) }
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Leave requests</h1>
      <Card title="Inbox" right={
        <select className="rounded-md border border-sand px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option>
        </select>}>
        <Err error={error || err} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-ink/60"><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th /></tr></thead>
            <tbody>
              {(data || []).map((r) => (
                <tr key={r._id} className="border-t border-sand">
                  <td className="py-1.5">{r.employeeId?.name} <span className="text-xs text-ink/50">{r.employeeId?.employeeCode}</span></td>
                  <td className="capitalize">{r.leaveTypeKey}</td><td>{r.startDate}</td><td>{r.endDate}</td><td>{r.days}</td><td>{r.reason}</td>
                  <td className="whitespace-nowrap text-right">
                    {r.status === 'pending' && user.role === 'hr' ? (
                      <><Btn onClick={() => decide(r._id, 'approve')}>Approve</Btn> <Btn variant="danger" onClick={() => decide(r._id, 'reject')}>Reject</Btn></>
                    ) : <Badge status={r.status} />}
                  </td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan="7" className="py-3 text-ink/50">Nothing here</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

