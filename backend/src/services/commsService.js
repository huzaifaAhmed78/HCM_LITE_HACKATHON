import { Announcement } from '../models/Announcement.js'
import { AuditLog } from '../models/AuditLog.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from './auditService.js'

export async function postAnnouncement(actor, { title, body }) {
  const doc = await Announcement.create({ title, body, authorId: actor.id, authorName: actor.name, authorRole: actor.role })
  await logAudit({ actor, action: 'announcement.create', entity: 'Announcement', entityId: doc._id, after: { title, body } })
  return doc
}

// Admin can delete any announcement. HR can delete only their own.
export async function deleteAnnouncement(actor, id) {
  const doc = await Announcement.findById(id)
  if (!doc) throw new ApiError(404, 'Announcement not found')
  if (actor.role !== 'admin' && String(doc.authorId) !== actor.id) {
    throw new ApiError(403, 'You can delete only your own announcements')
  }
  await doc.deleteOne()
  await logAudit({ actor, action: 'announcement.delete', entity: 'Announcement', entityId: id, before: { title: doc.title, body: doc.body } })
}

// Both `id` and `_id` are returned, so delete buttons work whichever one the screen reads.
export async function listAnnouncements(limit = 20) {
  const rows = await Announcement.find().sort({ createdAt: -1 }).limit(limit).lean()
  return rows.map((a) => ({ ...a, id: String(a._id), _id: String(a._id) }))
}

export async function listAudit({ action, entity, page = 1, limit = 25 }) {
  const filter = {}
  if (action) filter.action = new RegExp(action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  if (entity) filter.entity = entity
  const p = Math.max(1, Number(page) || 1)
  const l = Math.min(100, Math.max(1, Number(limit) || 25))
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ at: -1 }).skip((p - 1) * l).limit(l).lean(),
    AuditLog.countDocuments(filter),
  ])
  const users = await User.find({ _id: { $in: items.map((i) => i.actorId).filter(Boolean) } }).select('name').lean()
  const names = new Map(users.map((u) => [String(u._id), u.name]))
  return {
    total, page: p, pages: Math.ceil(total / l),
    items: items.map((i) => ({ id: String(i._id), at: i.at, actor: names.get(String(i.actorId)) || 'System', actorRole: i.actorRole, action: i.action, entity: i.entity, entityId: i.entityId, before: i.before, after: i.after })),
  }
}
