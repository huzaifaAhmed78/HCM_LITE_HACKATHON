import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Card, Err, Skeleton, useLoad } from './bits.jsx'

export default function AnnouncementsCard({ limit = 3 }) {
  const { data, error, loading } = useLoad(() => api('/announcements'), [])
  return (
    <Card title="Announcements" right={<Link to="/announcements" className="text-sm text-pine underline">See all</Link>}>
      <Err error={error} />
      {loading && !data && <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
      {data?.length === 0 && <p className="text-sm text-ink/60">No announcements yet.</p>}
      <ul className="space-y-3">
        {(data || []).slice(0, limit).map((a) => (
          <li key={a.id ?? a._id} className="rounded-xl bg-paper p-3 text-sm">
            <div className="font-medium">{a.title}</div>
            <div className="mt-0.5 whitespace-pre-wrap text-ink/80">{a.body}</div>
            <div className="mt-1 text-xs text-ink/50">{a.authorName} ({a.authorRole}) &middot; {new Date(a.createdAt).toLocaleDateString()}</div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
