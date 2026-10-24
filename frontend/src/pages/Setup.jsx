import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import AuthShell from '../components/AuthShell.jsx'
import { Alert, Btn, Field, fieldErrors } from '../components/ui.jsx'

export default function Setup() {
  const [f, setF] = useState({ companyName: '', adminName: '', email: '', password: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    api('/setup/status').then((s) => s?.setupCompleted && navigate('/login', { replace: true })).catch(() => {})
  }, [navigate])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await api('/setup/first-run', { method: 'POST', body: f })
      await login(f.email, f.password)
      navigate('/', { replace: true })
    } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  const fe = fieldErrors(err)

  return (
    <AuthShell title="Set up your company" subtitle="Create the company and its Admin account. This only runs once.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Company name" value={f.companyName} onChange={set('companyName')} error={fe.companyName} required />
        <Field label="Admin name" value={f.adminName} onChange={set('adminName')} error={fe.adminName} required />
        <Field label="Admin email" type="email" value={f.email} onChange={set('email')} error={fe.email} required />
        <Field label="Password (8+ characters)" type="password" value={f.password} onChange={set('password')} error={fe.password} required />
        <Alert>{err && !Object.keys(fe).length ? err.message : null}</Alert>
        <Btn className="w-full" disabled={busy}>{busy ? 'Creating…' : 'Create company'}</Btn>
      </form>
    </AuthShell>
  )
}
