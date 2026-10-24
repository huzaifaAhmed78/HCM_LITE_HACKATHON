import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { Alert, Btn, Card, Empty, Field, TempPassword, cx, fieldErrors } from '../components/ui.jsx'

export default function HrUsers() {
  const [items, setItems] = useState(null)
  const [f, setF] = useState({ name: '', email: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState(null)

  const load = useCallback(() => api('/users?role=hr').then(setItems).catch(setErr), [])
  useEffect(() => { load() }, [load])

  const create = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const r = await api('/users/hr', { method: 'POST', body: f })
      setShown({ title: 'HR login created', email: r.user?.email || f.email, password: r.temporaryPassword })
      setF({ name: '', email: '' })
      await load()
    } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  const toggle = async (u) => {
    setErr(null)
    try { await api(`/users/${u.id}/${u.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' }); await load() } catch (x) { setErr(x) }
  }
  const reset = async (u) => {
    if (!confirm(`Issue a new temporary password for ${u.email}?`)) return
    setErr(null)
    try {
      const r = await api(`/users/${u.id}/reset-password`, { method: 'POST' })
      setShown({ title: 'Password reset', email: u.email, password: r.temporaryPassword })
    } catch (x) { setErr(x) }
  }
  const fe = fieldErrors(err)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">HR logins</h1>
      <Card className="p-4">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={fe.name} required />
          <Field label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={fe.email} required />
          <Btn disabled={busy}>Create HR login</Btn>
        </form>
      </Card>
      <Alert>{err && !Object.keys(fe).length ? err.message : null}</Alert>
      <Card className="overflow-x-auto">
        {!items ? <Empty>Loading…</Empty> : items.length === 0 ? <Empty>No HR logins yet. Create the first one above.</Empty> : (
          <table className="w-full text-sm">
            <thead className="border-b border-sand text-left text-ink/60">
              <tr><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Email</th><th className="px-4 py-2 font-medium">Status</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={cx('rounded px-1.5 py-0.5 text-xs', u.isActive ? 'bg-pine/10 text-pine' : 'bg-sand')}>{u.isActive ? 'Active' : 'Deactivated'}</span>
                  </td>
                  <td className="space-x-2 px-4 py-3 text-right whitespace-nowrap">
                    <Btn variant="ghost" onClick={() => reset(u)}>Reset password</Btn>
                    <Btn variant={u.isActive ? 'danger' : 'ghost'} onClick={() => toggle(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {shown && <TempPassword {...shown} onClose={() => setShown(null)} />}
    </div>
  )
}
