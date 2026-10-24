import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { Alert, Btn, Card, Empty, Field, fieldErrors } from '../components/ui.jsx'

// Departments and designations are both a simple list of names.
export default function NamedList({ title, path, noun }) {
  const [items, setItems] = useState(null)
  const [name, setName] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api(path).then(setItems).catch(setErr), [path])
  useEffect(() => { load() }, [load])

  const add = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try { await api(path, { method: 'POST', body: { name } }); setName(''); await load() }
    catch (x) { setErr(x) } finally { setBusy(false) }
  }
  const remove = async (item) => {
    if (!confirm(`Delete ${noun} "${item.name}"?`)) return
    setErr(null)
    try { await api(`${path}/${item.id}`, { method: 'DELETE' }); await load() } catch (x) { setErr(x) }
  }
  const fe = fieldErrors(err)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{title}</h1>
      <form onSubmit={add} className="flex items-end gap-2">
        <div className="max-w-xs flex-1"><Field label={`New ${noun}`} value={name} onChange={(e) => setName(e.target.value)} error={fe.name} required /></div>
        <Btn disabled={busy}>Add {noun}</Btn>
      </form>
      <Alert>{err && !Object.keys(fe).length ? err.message : null}</Alert>
      <Card>
        {!items ? <Empty>Loading…</Empty> : items.length === 0 ? <Empty>No {noun}s yet. Add the first one above.</Empty> : (
          <ul className="divide-y divide-sand">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{i.name}</span>
                <Btn variant="danger" onClick={() => remove(i)}>Delete</Btn>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
