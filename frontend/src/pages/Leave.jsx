import { useState } from 'react'
import { api } from '../api.js'
import { Badge, Btn, Card, Err, Field, inputCls, useLoad } from '../components/bits.jsx'

export default function Leave() {
  const bal = useLoad(() => api('/leaves/balance'), [])
  const list = useLoad(() => api('/leaves'), [])
  const [form, setForm] = useState({ leaveTypeKey: '', startDate: '', endDate: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [smart, setSmart] = useState({ text: '', busy: false, msg: '' })

  const refresh = () => Promise.all([bal.reload(), list.reload()])
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await api('/leaves', { method: 'POST', body: { ...form, leaveTypeKey: form.leaveTypeKey || bal.data?.[0]?.key } })
      setForm({ ...form, startDate: '', endDate: '', reason: '' })
      await refresh()
    } catch (e2) { setErr(e2) } finally { setBusy(false) }
  }
  // Smart leave: the AI only fills the form. Nothing is saved until the employee presses Apply.
  const fillFromText = async (e) => {
    e.preventDefault()
    setSmart({ ...smart, busy: true, msg: '' }); setErr(null)
    try {
      const r = await api('/ai/smart-leave', { method: 'POST', body: { text: smart.text } })
      setForm({ leaveTypeKey: r.leaveTypeKey, startDate: r.startDate, endDate: r.endDate, reason: r.reason })
      setSmart({ text: smart.text, busy: false, msg: 'AI-generated. Please check the form below and press Apply to confirm.' })
    } catch (x) { setSmart({ ...smart, busy: false, msg: '' }); setErr(x) }
  }
  const cancel = async (id) => {
    setErr(null)
    try { await api(`/leaves/${id}/cancel`, { method: 'PATCH', body: {} }); await refresh() } catch (e) { setErr(e) }
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">My leave</h1>
      <Err error={err || bal.error} />
      <Card title="Balance (this year)">
        <div className="grid gap-3 sm:grid-cols-4">
          {(bal.data || []).map((b) => (
            <div key={b.key} className="rounded-md border border-sand p-3 text-sm">
              <div className="font-medium">{b.name}</div>
              <div className="font-display text-2xl font-bold">{b.remaining == null ? 'Unlimited' : b.remaining}</div>
              <div className="text-xs text-ink/60">{b.quota == null ? 'unpaid' : `of ${b.quota}`} &middot; used {b.used} &middot; pending {b.pending}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Describe your leave in plain words">
        <form onSubmit={fillFromText} className="flex flex-col gap-2 sm:flex-row">
          <input className={inputCls} placeholder="e.g. Need next Monday and Tuesday off for my sister's wedding" value={smart.text} onChange={(e) => setSmart({ ...smart, text: e.target.value })} />
          <Btn disabled={smart.busy || smart.text.trim().length < 3}>{smart.busy ? 'Reading...' : 'Fill the form'}</Btn>
        </form>
        {smart.msg && <p className="mt-2 text-xs text-amber">{smart.msg}</p>}
      </Card>

      <Card title="Apply for leave">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
          <Field label="Type">
            <select className={inputCls} value={form.leaveTypeKey || bal.data?.[0]?.key || ''} onChange={(e) => setForm({ ...form, leaveTypeKey: e.target.value })}>
              {(bal.data || []).map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="From"><input required type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="To"><input required type="date" className={inputCls} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          <Field label="Reason"><input className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <div className="sm:col-span-4"><Btn disabled={busy}>Apply</Btn></div>
        </form>
        <p className="mt-2 text-xs text-ink/60">Weekends and holidays are not counted.</p>
      </Card>

      <Card title="My requests">
        <Err error={list.error} />
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-ink/60"><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Note</th><th /></tr></thead>
          <tbody>
            {(list.data || []).map((r) => (
              <tr key={r._id} className="border-t border-sand">
                <td className="py-1.5 capitalize">{r.leaveTypeKey}</td><td>{r.startDate}</td><td>{r.endDate}</td><td>{r.days}</td>
                <td><Badge status={r.status} /></td><td>{r.note}</td>
                <td className="text-right">{r.status === 'pending' && <Btn variant="ghost" onClick={() => cancel(r._id)}>Cancel</Btn>}</td>
              </tr>
            ))}
            {list.data?.length === 0 && <tr><td colSpan="7" className="py-3 text-ink/50">No requests yet</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

