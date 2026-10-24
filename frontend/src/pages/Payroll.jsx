import { useState } from 'react'
import { api, download } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Btn, Card, Err, currentMonth, inputCls, useLoad } from '../components/bits.jsx'
import { money } from '../components/ui.jsx'

export default function Payroll() {
  const { user } = useAuth()
  const [month, setMonth] = useState(currentMonth())
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const run = useLoad(async () => {
    try { return await api(`/payroll/runs/${month}`) } catch (e) { if (e.status === 404) return null; throw e }
  }, [month])
  const runs = useLoad(() => api('/payroll/runs'), [])

  const act = async (fn) => {
    setBusy(true); setErr(null)
    try { await fn(); await Promise.all([run.reload(), runs.reload()]) } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const draft = () => act(() => api('/payroll/runs', { method: 'POST', body: { month } }))
  const finalize = () => {
    if (!confirm(`Finalize ${month}? The month will be locked and nobody can change it.`)) return
    return act(() => api(`/payroll/runs/${month}/finalize`, { method: 'POST', body: {} }))
  }
  const pdf = (i) => download(`/payroll/payslip/${month}?employeeId=${i.employeeId}`, `payslip-${i.employeeCode}-${month}.pdf`).catch(setErr)

  const r = run.data
  const locked = r?.status === 'finalized'
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Payroll</h1>
      <Card title="Monthly run" right={
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" className={inputCls} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          {user.role === 'hr' && <Btn onClick={draft} disabled={busy || locked}>{r ? 'Refresh draft' : 'Create draft'}</Btn>}
          {user.role === 'admin' && <Btn onClick={finalize} disabled={busy || !r || locked}>Finalize and lock</Btn>}
        </div>}>
        <Err error={err || run.error} />
        {runs.data?.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {runs.data.map((x) => (
              <button key={x.month} onClick={() => setMonth(x.month)} className={`rounded border px-2 py-1 ${x.month === month ? 'border-pine bg-pine/10' : 'border-sand'}`}>
                {x.month} &middot; {x.status}
              </button>
            ))}
          </div>
        )}
        {!r && !run.loading && <p className="text-sm text-gray-500">{user.role === 'hr' ? 'No payroll for this month yet. Click Create draft.' : 'HR has not created a draft for this month yet.'}</p>}
        {r && (
          <>
            <p className={`mb-3 inline-block rounded px-2 py-0.5 text-xs font-medium ${locked ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {locked ? `Finalized and locked ${new Date(r.finalizedAt).toLocaleDateString()}` : 'Draft, waiting for Admin to finalize'}
            </p>
            <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
              <div>Employees<div className="font-bold">{r.totals.employees}</div></div>
              <div>Working days<div className="font-bold">{r.workingDays}</div></div>
              <div>Gross<div className="font-bold">{money(r.totals.gross)}</div></div>
              <div>Deductions + tax<div className="font-bold">{money(r.totals.deduction + r.totals.tax)}</div></div>
              <div>Net pay<div className="font-bold">{money(r.totals.net)}</div></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead><tr className="text-left text-xs text-gray-500"><th>Employee</th><th>Basic</th><th>Gross</th><th>Absent</th><th>Unpaid</th><th>Half</th><th>Deduction</th><th>Tax</th><th>Net</th><th /></tr></thead>
                <tbody>
                  {r.items.map((i) => (
                    <tr key={i.employeeId} className="border-t border-sand">
                      <td className="py-1.5">{i.name} <span className="text-xs text-gray-400">{i.employeeCode}</span>{i.eligibleDays !== i.workingDays && <span className="ml-1 rounded bg-sand px-1 text-[10px]">prorated {i.eligibleDays}/{i.workingDays}</span>}</td>
                      <td>{money(i.basic)}</td><td>{money(i.earnedGross)}</td><td>{i.absentDays}</td><td>{i.unpaidLeaveDays}</td><td>{i.halfDays}</td>
                      <td>{money(i.deduction)}</td><td>{money(i.tax)}</td><td className="font-medium">{money(i.net)}</td>
                      <td><Btn variant="ghost" onClick={() => pdf(i)}>PDF</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-400">Absent = past working day with no attendance record and no approved leave. Per day = gross / working days. Deduction = (absent + unpaid + 0.5 x half days) x per day. Joiners are prorated. Employees who have left are not prorated because the employee record has no exit date.</p>
          </>
        )}
      </Card>
    </div>
  )
}
