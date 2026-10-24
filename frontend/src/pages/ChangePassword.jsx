import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import AuthShell from '../components/AuthShell.jsx'
import { Alert, Btn, Field, fieldErrors } from '../components/ui.jsx'

export default function ChangePassword() {
  const { user, apply } = useAuth()
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (f.newPassword !== f.confirm) return setErr({ message: 'The new passwords do not match.', errors: [] })
    setBusy(true); setErr(null)
    try {
      const data = await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: f.currentPassword, newPassword: f.newPassword },
      })
      apply(data)
      navigate('/', { replace: true })
    } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  const fe = fieldErrors(err)

  return (
    <AuthShell
      title="Change password"
      subtitle={user.mustChangePassword ? 'You are using a temporary password. Choose a new one to continue.' : 'Choose a new password.'}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password" type="password" value={f.currentPassword} onChange={set('currentPassword')} error={fe.currentPassword} required />
        <Field label="New password (8+ characters)" type="password" value={f.newPassword} onChange={set('newPassword')} error={fe.newPassword} required />
        <Field label="Confirm new password" type="password" value={f.confirm} onChange={set('confirm')} required />
        <Alert>{err && !Object.keys(fe).length ? err.message : null}</Alert>
        <div className="flex gap-2">
          <Btn className="flex-1" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</Btn>
          {!user.mustChangePassword && <Btn type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Btn>}
        </div>
      </form>
    </AuthShell>
  )
}
