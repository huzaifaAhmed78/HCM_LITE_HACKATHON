import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import AuthShell from '../components/AuthShell.jsx'
import { Alert, Btn, Field, fieldErrors } from '../components/ui.jsx'

export default function Login() {
  const { user, login } = useAuth()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/'

  useEffect(() => {
    api('/setup/status').then((s) => setNeedsSetup(s && s.setupCompleted === false)).catch(() => {})
  }, [])

  if (user) return <Navigate to={user.mustChangePassword ? '/change-password' : '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const u = await login(f.email, f.password)
      navigate(u.mustChangePassword ? '/change-password' : from, { replace: true })
    } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  const fe = fieldErrors(err)

  return (
    <AuthShell title="Sign in" subtitle="Use the email and password your administrator gave you.">
      {needsSetup && (
        <div className="mb-4"><Alert kind="warn">No company exists yet. <Link className="font-medium underline" to="/setup">Run first-time setup</Link></Alert></div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={fe.email} required />
        <Field label="Password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={fe.password} required />
        <Alert>{err && !Object.keys(fe).length ? err.message : null}</Alert>
        <Btn className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Btn>
      </form>
    </AuthShell>
  )
}
