import { useState } from 'react'
import { api, download } from '../api.js'
import { Btn, Card, Err, useLoad } from '../components/bits.jsx'
import { money } from '../components/ui.jsx'

export default function Payslips() {
  const { data, error, loading } = useLoad(() => api('/payroll/my'), [])
  const [err, setErr] = useState(null)
  const pdf = (p) => download(`/payroll/payslip/${p.month}`, `payslip-${p.month}.pdf`).catch(setErr)
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">My payslips</h1>
      <Err error={err || error} />
      {loading && <p className="text-sm text-ink/50">Loading...</p>}
      {data?.length === 0 && <Card><p className="text-sm text-ink/60">No payslips yet. They appear here once Admin finalizes the month.</p></Card>}
      {(data || []).map((p) => (
        <Card key={p.month} title={p.month} right={<Btn onClick={() => pdf(p)}>Download PDF</Btn>}>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <div><dt className="text-xs text-ink/60">Gross</dt><dd className="font-medium">{money(p.earnedGross)}</dd></div>
            <div><dt className="text-xs text-ink/60">Absent / unpaid days</dt><dd className="font-medium">{p.absentDays} / {p.unpaidLeaveDays}</dd></div>
            <div><dt className="text-xs text-ink/60">Deduction</dt><dd className="font-medium">{money(p.deduction)}</dd></div>
            <div><dt className="text-xs text-ink/60">Tax</dt><dd className="font-medium">{money(p.tax)}</dd></div>
            <div><dt className="text-xs text-ink/60">Net pay</dt><dd className="font-display text-lg font-bold">{money(p.net)}</dd></div>
          </dl>
        </Card>
      ))}
    </div>
  )
}

