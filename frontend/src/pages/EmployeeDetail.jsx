import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Alert, Btn, Card, Empty, Field, cx, fieldErrors, money } from '../components/ui.jsx'

export const SalaryCards = ({ salary }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {[['Basic', salary.basic], ['HRA (40%)', salary.hra], ['Medical (10%)', salary.medical], ['Gross', salary.gross]].map(([k, v]) => (
      <Card key={k} className={cx('p-3', k === 'Gross' && 'border-pine bg-pine/5')}>
        <div className="text-xs text-ink/60">{k}</div>
        <div className="mt-1 font-display text-lg font-semibold">{money(v)}</div>
      </Card>
    ))}
  </div>
)

export const Details = ({ e }) => (
  <Card className="p-4">
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      {[['Employee code', e.employeeCode], ['Email', e.email], ['Department', e.department?.name], ['Designation', e.designation?.name],
        ['Phone', e.phone || 'Not added'], ['Address', e.address || 'Not added'],
        ['Joined', e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : '-'], ['Status', e.status]].map(([k, v]) => (
        <div key={k}><dt className="text-xs text-ink/60">{k}</dt><dd className="font-medium">{v}</dd></div>
      ))}
    </dl>
  </Card>
)

export default function EmployeeDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [e, setE] = useState(null)
  const [basic, setBasic] = useState('')
  const [err, setErr] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => { api(`/employees/${id}`).then((d) => { setE(d); setBasic(String(d.salary.basic)) }).catch(setErr) }, [id])

  const patch = async (body) => {
    setErr(null); setSaved(false)
    try { const d = await api(`/employees/${id}`, { method: 'PATCH', body }); setE(d); setBasic(String(d.salary.basic)); setSaved(true) } catch (x) { setErr(x) }
  }
  const fe = fieldErrors(err)

  if (!e) return err ? <Alert>{err.message}</Alert> : <Empty>Loading…</Empty>
  return (
    <div className="space-y-5">
      <Link to="/employees" className="text-sm text-pine hover:underline">Back to employees</Link>
      <h1 className="text-2xl font-bold">{e.name}</h1>
      <Details e={e} />
      <h2 className="text-lg font-semibold">Salary</h2>
      <SalaryCards salary={e.salary} />
      {user.role === 'hr' && (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Manage</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48"><Field label="Basic salary (Rs)" type="number" min="0" value={basic} onChange={(x) => setBasic(x.target.value)} error={fe.basic} /></div>
            <Btn variant="ghost" onClick={() => patch({ basic: Number(basic) })}>Update salary</Btn>
            <Btn variant={e.status === 'active' ? 'danger' : 'ghost'} onClick={() => patch({ status: e.status === 'active' ? 'inactive' : 'active' })}>
              {e.status === 'active' ? 'Deactivate employee' : 'Reactivate employee'}
            </Btn>
          </div>
          <div className="mt-3"><Alert>{err && !Object.keys(fe).length ? err.message : null}</Alert></div>
          {saved && <p className="mt-3 text-sm text-pine">Changes saved.</p>}
        </Card>
      )}
    </div>
  )
}
