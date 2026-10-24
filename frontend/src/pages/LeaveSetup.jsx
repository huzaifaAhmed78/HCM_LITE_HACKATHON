import { useState } from 'react'
import { api } from '../api.js'
import { Btn, Card, Err, Field, inputCls, Skeleton, useLoad } from '../components/bits.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import { useToast } from '../components/Toast.jsx'

// Leave types and holidays come back with `id` (not `_id`). Accept both so we never call /holidays/undefined.
const idOf = (x) => x.id ?? x._id

// Runs an API action, refreshes the list, and reports the result as a toast.
function useRun(reload, setErr) {
  const toast = useToast()
  return async (fn, successMessage) => {
    setErr(null)
    try {
      await fn()
      await reload()
      if (successMessage) toast.success(successMessage)
    } catch (e) {
      setErr(e)
      toast.error(e.message)
    }
  }
}

function LeaveTypes() {
  const { data, error, loading, reload } = useLoad(() => api('/leave-types'), [])
  const [err, setErr] = useState(null)
  const [form, setForm] = useState({ key: '', name: '', yearlyQuota: '', paid: true })
  const [confirm, confirmDialog] = useConfirm()
  const run = useRun(reload, setErr)

  const add = (e) => {
    e.preventDefault()
    run(async () => {
      await api('/leave-types', { method: 'POST', body: { key: form.key.trim().toLowerCase(), name: form.name.trim(), yearlyQuota: form.yearlyQuota === '' ? null : Number(form.yearlyQuota), paid: form.paid } })
      setForm({ key: '', name: '', yearlyQuota: '', paid: true })
    }, 'Leave type added')
  }
  const editQuota = (t) => {
    const v = window.prompt(`Yearly quota for ${t.name} (empty = unlimited)`, t.yearlyQuota ?? '')
    if (v === null) return
    run(() => api(`/leave-types/${idOf(t)}`, { method: 'PUT', body: { name: t.name, paid: t.paid, yearlyQuota: v.trim() === '' ? null : Number(v) } }), 'Quota updated')
  }
  const remove = async (t) => {
    const ok = await confirm({ title: 'Delete leave type?', message: `${t.name} will be removed. This is blocked if leave requests already use it.`, confirmLabel: 'Delete' })
    if (ok) run(() => api(`/leave-types/${idOf(t)}`, { method: 'DELETE' }), `${t.name} deleted`)
  }

  return (
    <Card title="Leave types">
      <Err error={error || err} />
      {loading && !data && <Skeleton className="mb-4 h-24" />}
      <div className="overflow-x-auto">
        <table className="mb-4 w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500"><th>Name</th><th>Key</th><th>Yearly quota</th><th>Paid</th><th /></tr></thead>
          <tbody>
            {(data || []).map((t) => (
              <tr key={idOf(t)} className="border-t border-sand">
                <td className="py-2">{t.name}</td><td>{t.key}</td><td>{t.yearlyQuota ?? 'Unlimited'}</td><td>{t.paid ? 'Yes' : 'No'}</td>
                <td className="whitespace-nowrap text-right">
                  <Btn variant="ghost" onClick={() => editQuota(t)}>Edit quota</Btn>{' '}
                  <Btn variant="danger" onClick={() => remove(t)}>Delete</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-5">
        <Field label="Name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Key (e.g. maternity)"><input required className={inputCls} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} /></Field>
        <Field label="Yearly quota"><input type="number" min="0" className={inputCls} placeholder="empty = unlimited" value={form.yearlyQuota} onChange={(e) => setForm({ ...form, yearlyQuota: e.target.value })} /></Field>
        <Field label="Paid"><select className={inputCls} value={String(form.paid)} onChange={(e) => setForm({ ...form, paid: e.target.value === 'true' })}><option value="true">Yes</option><option value="false">No</option></select></Field>
        <div className="flex items-end"><Btn>Add type</Btn></div>
      </form>
      {confirmDialog}
    </Card>
  )
}

function Holidays() {
  const { data, error, loading, reload } = useLoad(() => api('/holidays'), [])
  const [err, setErr] = useState(null)
  const [form, setForm] = useState({ date: '', name: '' })
  const [confirm, confirmDialog] = useConfirm()
  const run = useRun(reload, setErr)

  const add = (e) => {
    e.preventDefault()
    run(async () => {
      await api('/holidays', { method: 'POST', body: { date: form.date, name: form.name.trim() } })
      setForm({ date: '', name: '' })
    }, 'Holiday added')
  }
  const remove = async (h) => {
    const ok = await confirm({ title: 'Delete holiday?', message: `${h.name} (${h.date}) will be removed from the calendar.`, confirmLabel: 'Delete' })
    if (ok) run(() => api(`/holidays/${idOf(h)}`, { method: 'DELETE' }), `${h.name} deleted`)
  }

  return (
    <Card title="Holidays">
      <Err error={error || err} />
      <form onSubmit={add} className="mb-4 grid gap-3 sm:grid-cols-4">
        <Field label="Date"><input required type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
        <div className="flex items-end"><Btn>Add holiday</Btn></div>
      </form>
      {loading && !data && <Skeleton className="h-24" />}
      <table className="w-full text-sm">
        <tbody>
          {(data || []).map((h) => (
            <tr key={idOf(h)} className="border-t border-sand">
              <td className="py-2">{h.date}</td><td>{h.name}</td>
              <td className="text-right"><Btn variant="danger" onClick={() => remove(h)}>Delete</Btn></td>
            </tr>
          ))}
          {data?.length === 0 && <tr><td className="py-3 text-ink/60">No holidays yet. Add the first one above.</td></tr>}
        </tbody>
      </table>
      {confirmDialog}
    </Card>
  )
}

export default function LeaveSetup() {
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Leave types and holidays</h1>
      <LeaveTypes />
      <Holidays />
    </div>
  )
}
