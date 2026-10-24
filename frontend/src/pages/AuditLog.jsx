import { Fragment, useState } from 'react'
import { api } from '../api.js'
import { Btn, Card, Err, inputCls, useLoad } from '../components/bits.jsx'

export default function AuditLog() {
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const q = new URLSearchParams({ page, ...(action && { action }), ...(entity && { entity }) }).toString()
  const { data, error, loading } = useLoad(() => api(`/audit?${q}`), [q])

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Audit log</h1>
      <Card title="Every important action" right={
        <div className="flex gap-2 text-sm">
          <input className={inputCls} placeholder="Action, e.g. payroll" value={action} onChange={(e) => { setPage(1); setAction(e.target.value) }} />
          <select className={inputCls} value={entity} onChange={(e) => { setPage(1); setEntity(e.target.value) }}>
            <option value="">All entities</option>
            {['Employee', 'LeaveRequest', 'Attendance', 'AttendanceCorrection', 'PayrollRun', 'Settings', 'Announcement', 'User'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>}>
        <Err error={error} />
        {loading && !data && <p className="text-sm text-gray-400">Loading...</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500"><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th /></tr></thead>
            <tbody>
              {(data?.items || []).map((a) => (
                <Fragment key={a.id}>
                  <tr className="border-t border-sand">
                    <td className="whitespace-nowrap py-1.5">{new Date(a.at).toLocaleString()}</td>
                    <td>{a.actor} <span className="text-xs text-gray-400">{a.actorRole}</span></td>
                    <td className="font-medium">{a.action}</td><td>{a.entity}</td>
                    <td className="text-right"><Btn variant="ghost" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'Hide' : 'Details'}</Btn></td>
                  </tr>
                  {open === a.id && (
                    <tr className="bg-paper"><td colSpan="5" className="p-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><div className="mb-1 text-xs font-medium text-gray-500">Before</div><pre className="max-h-60 overflow-auto rounded bg-white p-2 text-xs">{JSON.stringify(a.before, null, 2) ?? 'null'}</pre></div>
                        <div><div className="mb-1 text-xs font-medium text-gray-500">After</div><pre className="max-h-60 overflow-auto rounded bg-white p-2 text-xs">{JSON.stringify(a.after, null, 2) ?? 'null'}</pre></div>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
              {data?.items.length === 0 && <tr><td colSpan="5" className="py-3 text-gray-400">No entries</td></tr>}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <Btn variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <span>Page {data.page} of {data.pages}</span>
            <Btn variant="ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        )}
      </Card>
    </div>
  )
}
