import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export const cx = (...a) => a.filter(Boolean).join(' ')
export const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`
export const fieldErrors = (err) =>
  Object.fromEntries((err?.errors || []).filter((e) => e.field).map((e) => [e.field, e.message]))

export function Field({ label, error, as: As = 'input', children, ...p }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <As
        className={cx(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2',
          error ? 'border-red-500 focus:ring-red-200' : 'border-sand hover:border-pine/50 focus:border-pine focus:ring-pine/20'
        )}
        {...p}
      >
        {children}
      </As>
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  )
}

export function Btn({ variant = 'primary', className, ...p }) {
  const styles = {
    primary: 'bg-pine-dark text-white hover:bg-pine disabled:opacity-50',
    ghost: 'border border-sand bg-white hover:bg-paper disabled:opacity-50',
    danger: 'border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50',
  }
  return (
    <button
      className={cx('rounded-lg px-4 py-2 text-sm font-medium transition duration-150 active:scale-[0.98]', styles[variant], className)}
      {...p}
    />
  )
}

export const Card = ({ className, ...p }) => (
  <div className={cx('rounded-2xl border border-sand bg-white shadow-card', className)} {...p} />
)

export function Alert({ kind = 'error', children }) {
  if (!children) return null
  const s = kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber/30 bg-amber/10 text-amber'
  return <div role="alert" className={cx('rounded-xl border px-3 py-2 text-sm', s)}>{children}</div>
}

// The modal is rendered into document.body (portal), so parent layout such as "space-y-5"
// can no longer push it down the page. It is always centred in the screen, the page behind
// it does not scroll, and only the modal body scrolls when the content is taller than the screen.
export function Modal({ title, onClose, footer, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-[2px] sm:p-6">
      <div role="dialog" aria-modal="true" className="anim-pop flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-lift">
        <div className="flex shrink-0 items-center justify-between border-b border-sand px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-xl leading-none text-ink/60 hover:bg-paper">&times;</button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-sand bg-white px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

// The temporary password is shown once by the backend and never stored, so make it easy to copy.
export function TempPassword({ title = 'Login created', email, password, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(password); setCopied(true) } catch { /* ignore */ }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm">Share these details with the user. The temporary password will not be shown again.</p>
      <dl className="mt-3 space-y-2 rounded-xl bg-paper p-3 text-sm">
        <div><dt className="text-xs text-ink/60">Email</dt><dd className="font-medium">{email}</dd></div>
        <div><dt className="text-xs text-ink/60">Temporary password</dt><dd className="font-mono text-base font-semibold">{password}</dd></div>
      </dl>
      <div className="mt-4 flex justify-end gap-2">
        <Btn variant="ghost" onClick={copy}>{copied ? 'Copied' : 'Copy password'}</Btn>
        <Btn onClick={onClose}>Done</Btn>
      </div>
    </Modal>
  )
}

export const Empty = ({ children }) => <p className="px-4 py-8 text-center text-sm text-ink/60">{children}</p>
