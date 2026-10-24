import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Btn, Card, cx, Err, Field, inputCls, Skeleton, useLoad } from '../components/bits.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import { useToast } from '../components/Toast.jsx'

// Some endpoints return `id`, some `_id`. Accept both so delete never calls /announcements/undefined.
const idOf = (a) => a.id ?? a._id

const initial = (name = '') => (name.trim()[0] || '?').toUpperCase()

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  )
}

export default function Announcements() {
  const { user } = useAuth()
  const toast = useToast()
  const [confirm, confirmDialog] = useConfirm()
  const canPost = user.role === 'admin' || user.role === 'hr'
  const canDelete = user.role === 'admin' // add `|| user.role === 'hr'` if the backend allows HR to delete too
  const { data, error, loading, reload } = useLoad(() => api('/announcements'), [])
  const [f, setF] = useState({ title: '', body: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(null)

  const post = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await api('/announcements', { method: 'POST', body: f })
      setF({ title: '', body: '' })
      await reload()
      toast.success('Announcement posted')
    } catch (x) { setErr(x) } finally { setBusy(false) }
  }

  const remove = async (a) => {
    const id = idOf(a)
    if (!id) { toast.error('This announcement has no id, so it cannot be deleted.'); return }
    const ok = await confirm({
      title: 'Delete announcement?',
      message: `"${a.title}" will be removed for everyone. This cannot be undone.`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await api(`/announcements/${id}`, { method: 'DELETE' })
      setLeaving(id)
      await new Promise((r) => setTimeout(r, 220)) // let the exit animation play
      await reload()
      toast.success('Announcement deleted')
    } catch (x) {
      toast.error(x.message)
    } finally {
      setLeaving(null)
    }
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Announcements</h1>
      {canPost && (
        <Card title="Post an announcement">
          <form onSubmit={post} className="space-y-3">
            <Field label="Title"><input required minLength="3" className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Message"><textarea required minLength="3" rows="3" className={inputCls} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
            <Err error={err} />
            <Btn disabled={busy}>{busy ? 'Posting...' : 'Post'}</Btn>
          </form>
        </Card>
      )}

      <Card title="All announcements">
        <Err error={error} />
        {loading && !data && (
          <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        )}
        {data?.length === 0 && (
          <p className="py-6 text-center text-sm text-ink/60">
            {canPost ? 'No announcements yet. Post the first one above.' : 'Nothing has been posted yet.'}
          </p>
        )}
        <ul className="space-y-3">
          {(data || []).map((a) => {
            const id = idOf(a)
            return (
              <li key={id} className={cx('flex gap-3 rounded-xl border border-sand p-4 text-sm', leaving === id && 'anim-leave')}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pine-dark text-sm font-semibold text-white" aria-hidden="true">{initial(a.authorName)}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{a.title}</div>
                  <div className="mt-0.5 whitespace-pre-wrap text-ink/80">{a.body}</div>
                  <div className="mt-1.5 text-xs text-ink/50">{a.authorName} ({a.authorRole}) &middot; {new Date(a.createdAt).toLocaleString()}</div>
                </div>
                {canDelete && (
                  <button
                    onClick={() => remove(a)}
                    aria-label={`Delete announcement ${a.title}`}
                    title="Delete"
                    className="h-9 w-9 shrink-0 place-items-center self-start rounded-full text-ink/40 transition-colors hover:bg-red-50 hover:text-red-600"
                    style={{ display: 'grid' }}
                  >
                    <TrashIcon />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
      {confirmDialog}
    </div>
  )
}
