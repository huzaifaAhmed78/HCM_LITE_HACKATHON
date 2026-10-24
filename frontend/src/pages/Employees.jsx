import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Alert, Btn, Card, Empty, Field, Modal, TempPassword, cx, fieldErrors } from '../components/ui.jsx'

const blank = { name: '', email: '', phone: '', address: '', departmentId: '', designationId: '', joiningDate: '', basic: '' }

function RegisterForm({ onDone, onClose }) {
  const [f, setF] = useState(blank)
  const [deps, setDeps] = useState([])
  const [dess, setDess] = useState([])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    api('/departments').then(setDeps).catch(setErr)
    api('/designations').then(setDess).catch(setErr)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    const body = { name: f.name, email: f.email, departmentId: f.departmentId, designationId: f.designationId, basic: Number(f.basic) }
    if (f.phone) body.phone = f.phone
    if (f.address) body.address = f.address
    if (f.joiningDate) body.joiningDate = f.joiningDate
    try { onDone(await api('/employees', { method: 'POST', body })) } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  const fe = fieldErrors(err)
  const missing = deps.length === 0 || dess.length === 0

  // The buttons live in the modal footer, which is always visible. They submit the form by its id.
  const footer = (
    <>
      <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn type="submit" form="register-employee-form" disabled={busy || missing}>{busy ? 'Saving...' : 'Save employee'}</Btn>
    </>
  )

  return (
    <Modal title="Register employee" onClose={onClose} footer={footer}>
      {missing && <div className="mb-3"><Alert kind="warn">An Admin needs to add at least one department and one designation first.</Alert></div>}
      <form id="register-employee-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" value={f.name} onChange={set('name')} error={fe.name} required />
        <Field label="Email" type="email" value={f.email} onChange={set('email')} error={fe.email} required />
        <Field as="select" label="Department" value={f.departmentId} onChange={set('departmentId')} error={fe.departmentId} required>
          <option value="">Select...</option>
          {deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Field>
        <Field as="select" label="Designation" value={f.designationId} onChange={set('designationId')} error={fe.designationId} required>
          <option value="">Select...</option>
          {dess.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Field>
        <Field label="Basic salary (Rs)" type="number" min="0" value={f.basic} onChange={set('basic')} error={fe.basic} required />
        <Field label="Joining date" type="date" value={f.joiningDate} onChange={set('joiningDate')} error={fe.joiningDate} />
        <Field label="Phone" value={f.phone} onChange={set('phone')} error={fe.phone} />
        <Field label="Address" value={f.address} onChange={set('address')} error={fe.address} />
        <div className="sm:col-span-2"><Alert>{err && !Object.keys(fe).length ? err.message : null}</Alert></div>
        <p className="text-xs text-ink/60 sm:col-span-2">HRA (40%) and medical (10%) are added automatically, so gross pay is 1.5 x basic.</p>
      </form>
    </Modal>
  )
}

export default function Employees() {
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [reg, setReg] = useState(false)
  const [shown, setShown] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams({ page, limit: 10 })
      if (q) p.set('q', q)
      if (status) p.set('status', status)
      api(`/employees?${p}`).then((d) => { setData(d); setErr(null) }).catch(setErr)
    }, 250)
    return () => clearTimeout(t)
  }, [q, status, page, tick])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employees</h1>
        {user.role === 'hr' && <Btn onClick={() => setReg(true)}>Register employee</Btn>}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="w-full max-w-xs"><Field label="Search" placeholder="Name, email or code" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></div>
        <div className="w-40">
          <Field as="select" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </Field>
        </div>
      </div>
      <Alert>{err?.message}</Alert>
      <Card className="overflow-x-auto">
        {!data ? <Empty>Loading...</Empty> : data.items.length === 0 ? <Empty>No employees match. {user.role === 'hr' ? 'Register the first one with the button above.' : ''}</Empty> : (
          <table className="w-full text-sm">
            <thead className="border-b border-sand text-left text-ink/60">
              <tr>{['Code', 'Name', 'Department', 'Designation', 'Status'].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {data.items.map((e) => (
                <tr key={e.id} className="hover:bg-paper">
                  <td className="px-4 py-3 whitespace-nowrap">{e.employeeCode}</td>
                  <td className="px-4 py-3"><Link className="font-medium text-pine hover:underline" to={`/employees/${e.id}`}>{e.name}</Link><div className="text-xs text-ink/60">{e.email}</div></td>
                  <td className="px-4 py-3">{e.department?.name}</td>
                  <td className="px-4 py-3">{e.designation?.name}</td>
                  <td className="px-4 py-3"><span className={cx('rounded px-1.5 py-0.5 text-xs', e.status === 'active' ? 'bg-pine/10 text-pine' : 'bg-sand')}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink/60">{data.total} employees, page {data.page} of {data.pages}</span>
          <div className="flex gap-2">
            <Btn variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <Btn variant="ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        </div>
      )}
      {reg && <RegisterForm onClose={() => setReg(false)} onDone={(r) => {
        setReg(false); setTick(tick + 1)
        setShown({ title: 'Employee registered', email: r.employee.email, password: r.temporaryPassword })
      }} />}
      {shown && <TempPassword {...shown} onClose={() => setShown(null)} />}
    </div>
  )
}
