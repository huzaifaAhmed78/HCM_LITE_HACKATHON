import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Alert, Btn, Card, Empty, Field, fieldErrors } from '../components/ui.jsx'
import { Details, SalaryCards } from './EmployeeDetail.jsx'

export default function MyProfile() {
  const [e, setE] = useState(null)
  const [f, setF] = useState({ phone: '', address: '' })
  const [err, setErr] = useState(null)
  const [saved, setSaved] = useState(false)

  const fill = (d) => { setE(d); setF({ phone: d.phone || '', address: d.address || '' }) }
  useEffect(() => { api('/employees/me').then(fill).catch(setErr) }, [])

  const save = async (ev) => {
    ev.preventDefault()
    setErr(null); setSaved(false)
    try { fill(await api('/employees/me', { method: 'PATCH', body: f })); setSaved(true) } catch (x) { setErr(x) }
  }
  const fe = fieldErrors(err)

  if (!e) return err ? <Alert>{err.message}</Alert> : <Empty>Loading…</Empty>
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">My profile</h1>
      <Details e={e} />
      <h2 className="text-lg font-semibold">My salary</h2>
      <SalaryCards salary={e.salary} />
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Contact details</h2>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone" value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value })} error={fe.phone} />
          <Field label="Address" value={f.address} onChange={(x) => setF({ ...f, address: x.target.value })} error={fe.address} />
          <div className="flex items-center gap-3 sm:col-span-2">
            <Btn>Save contact details</Btn>
            {saved && <span className="text-sm text-pine">Saved.</span>}
          </div>
          <div className="sm:col-span-2"><Alert>{err && !Object.keys(fe).length ? err.message : null}</Alert></div>
        </form>
      </Card>
    </div>
  )
}
