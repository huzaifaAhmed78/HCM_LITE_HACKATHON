import { AuditLog } from '../models/AuditLog.js'

// The ONLY place that writes audit entries. Call it after every important change.
// actor = req.user (or null for system actions).
export async function logAudit({ actor = null, action, entity, entityId = null, before = null, after = null }) {
  await AuditLog.create({
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? 'system',
    action,
    entity,
    entityId: entityId ? String(entityId) : null,
    before,
    after,
  })
}
