
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Alert, Btn, Card, Empty, Field, cx, fieldErrors, money } from '../components/ui.jsx'

export const SalaryCards = ({ salary }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {[
      ['Basic', salary.basic],
      ['HRA (40%)', salary.hra],
      ['Medical (10%)', salary.medical],
      ['Gross', salary.gross],
    ].map(([k, v]) => (
      <Card
        key={k}
        className={cx(
          'p-3',
          k === 'Gross' && 'border-pine bg-pine/5'
        )}
      >
        <div className="text-xs text-ink/60">{k}</div>
        <div className="mt-1 font-display text-lg font-semibold">
          {money(v)}
        </div>
      </Card>
    ))}
  </div>
)

export const Details = ({ e }) => (
  <Card className="p-4">
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      {[
        ['Employee code', e.employeeCode],
        ['Email', e.email],
        ['Department', e.department?.name],
        ['Designation', e.designation?.name],
        ['Phone', e.phone || 'Not added'],
        ['Address', e.address || 'Not added'],
        [
          'Joined',
          e.joiningDate
            ? new Date(e.joiningDate).toLocaleDateString()
            : '-',
        ],
        ['Employment status', e.status],
      ].map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-ink/60">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
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

  // Admin login-management state
  const [login, setLogin] = useState(null)
  const [loginBusy, setLoginBusy] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadEmployee() {
      try {
        const data = await api(`/employees/${id}`)
        if (cancelled) return

        setE(data)
        setBasic(String(data.salary.basic))
      } catch (x) {
        if (!cancelled) setErr(x)
      }
    }

    async function loadLogin() {
      if (user.role !== 'admin') return

      try {
        const users = await api('/users?role=employee')
        if (cancelled) return

        const linkedUser = users.find(
          (u) => String(u.employeeId) === String(id)
        )

        setLogin(linkedUser || null)
      } catch (x) {
        if (!cancelled) setErr(x)
      }
    }

    loadEmployee()
    loadLogin()

    return () => {
      cancelled = true
    }
  }, [id, user.role])

  // Existing HR employee-management functionality
  const patch = async (body) => {
    setErr(null)
    setSaved(false)

    try {
      const data = await api(`/employees/${id}`, {
        method: 'PATCH',
        body,
      })

      setE(data)
      setBasic(String(data.salary.basic))
      setSaved(true)
    } catch (x) {
      setErr(x)
    }
  }

  // Admin: activate or deactivate the employee's LOGIN
  const toggleLogin = async () => {
    if (!login || loginBusy) return

    const action = login.isActive ? 'deactivate' : 'activate'
    const message = login.isActive
      ? `Deactivate login for ${login.email}?`
      : `Activate login for ${login.email}?`

    if (!window.confirm(message)) return

    setErr(null)
    setTemporaryPassword('')
    setLoginBusy(true)

    try {
      const updatedUser = await api(`/users/${login.id}/${action}`, {
        method: 'PATCH',
      })

      setLogin(updatedUser)
    } catch (x) {
      setErr(x)
    } finally {
      setLoginBusy(false)
    }
  }

  // Admin: reset the employee's password
  const resetLoginPassword = async () => {
    if (!login || loginBusy) return

    if (
      !window.confirm(
        `Reset password for ${login.email}? The employee will need to change the temporary password.`
      )
    ) {
      return
    }

    setErr(null)
    setTemporaryPassword('')
    setLoginBusy(true)

    try {
      const result = await api(
        `/users/${login.id}/reset-password`,
        { method: 'POST' }
      )

      setTemporaryPassword(result.temporaryPassword || '')
    } catch (x) {
      setErr(x)
    } finally {
      setLoginBusy(false)
    }
  }

  const fe = fieldErrors(err)

  if (!e) {
    return err ? <Alert>{err.message}</Alert> : <Empty>Loading…</Empty>
  }

  return (
    <div className="space-y-5">
      <Link
        to="/employees"
        className="text-sm text-pine hover:underline"
      >
        Back to employees
      </Link>

      <h1 className="text-2xl font-bold">{e.name}</h1>

      <Details e={e} />

      <h2 className="text-lg font-semibold">Salary</h2>
      <SalaryCards salary={e.salary} />

      {/* Admin-only login management */}
      {user.role === 'admin' && (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="font-semibold">
              Employee Login Management
            </h2>
          </div>

          {login === null ? (
            <Alert>
              Employee login details load nahi huay ya linked login record
              nahi mila. Please refresh karke dobara try karein.
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-ink/60">Login email:</span>
                <span className="font-medium">{login.email}</span>

                <span
                  className={cx(
                    'rounded px-2 py-1 text-xs',
                    login.isActive
                      ? 'bg-pine/10 text-pine'
                      : 'bg-sand text-ink'
                  )}
                >
                  {login.isActive ? 'Login Active' : 'Login Deactivated'}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Btn
                  disabled={loginBusy}
                  variant={login.isActive ? 'danger' : 'ghost'}
                  onClick={toggleLogin}
                >
                  {loginBusy
                    ? 'Please wait...'
                    : login.isActive
                      ? 'Deactivate Login'
                      : 'Activate Login'}
                </Btn>

                <Btn
                  disabled={loginBusy}
                  onClick={resetLoginPassword}
                >
                  Reset Password
                </Btn>
              </div>

              {temporaryPassword && (
                <div className="space-y-2 rounded-md border border-sand p-3">
                  <p className="text-sm font-semibold">
                    Temporary password
                  </p>

                  <code className="block break-all text-sm">
                    {temporaryPassword}
                  </code>

                  <p className="text-xs text-ink/60">
                    Is password ko employee ko securely dein. Employee ko
                    login ke baad password change karna hoga.
                  </p>

                  <Btn
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(temporaryPassword)
                        .catch(() =>
                          setErr({
                            message: 'Password copy nahi ho saka. Manually copy karein.',
                          })
                        )
                    }}
                  >
                    Copy temporary password
                  </Btn>
                </div>
              )}
            </>
          )}

          {err && <Alert>{err.message}</Alert>}
        </Card>
      )}

      {/* Existing HR-only management controls */}
      {user.role === 'hr' && (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Manage Employee</h2>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Field
                label="Basic salary (Rs)"
                type="number"
                min="0"
                value={basic}
                onChange={(x) => setBasic(x.target.value)}
                error={fe.basic}
              />
            </div>

            <Btn
              variant="ghost"
              onClick={() => patch({ basic: Number(basic) })}
            >
              Update salary
            </Btn>

            <Btn
              variant={e.status === 'active' ? 'danger' : 'ghost'}
              onClick={() =>
                patch({
                  status: e.status === 'active' ? 'inactive' : 'active',
                })
              }
            >
              {e.status === 'active'
                ? 'Deactivate employee'
                : 'Reactivate employee'}
            </Btn>
          </div>

          {err && <div className="mt-3"><Alert>{err.message}</Alert></div>}

          {saved && (
            <p className="mt-3 text-sm text-pine">
              Changes saved.
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
