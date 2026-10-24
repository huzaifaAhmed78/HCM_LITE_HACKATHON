import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorRole: { type: String, default: 'system' },
  action: { type: String, required: true }, // e.g. 'employee.create', 'payroll.finalize'
  entity: { type: String, required: true },
  entityId: { type: String, default: null },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  at: { type: Date, default: Date.now, index: true },
})

// Append-only: nobody can change or delete audit entries.
for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
  auditLogSchema.pre(op, () => {
    throw new Error('Audit log is append-only')
  })
}

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
