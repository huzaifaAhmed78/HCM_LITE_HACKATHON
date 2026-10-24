import mongoose from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { docView } from '../views/docView.js'
import { logAudit } from './auditService.js'

// Small shared CRUD for simple setup lists (departments, designations, leave types, holidays).
// Every create / update / delete is written to the audit log with before and after.
export function makeCrudService({ Model, entity, sort, checkRefs = async () => {} }) {
  const find = async (id) => {
    const doc = await Model.findById(id)
    if (!doc) throw new ApiError(404, `${entity} not found`)
    return doc
  }

  return {
    list: () => Model.find().sort(sort),

    async create(actor, data) {
      await checkRefs(data)
      const doc = await Model.create(data)
      await logAudit({ actor, action: `${entity}.create`, entity, entityId: doc._id, after: docView(doc) })
      return doc
    },

    async update(actor, id, data) {
      const doc = await find(id)
      await checkRefs(data)
      const before = docView(doc)
      doc.set(data)
      await doc.save()
      await logAudit({ actor, action: `${entity}.update`, entity, entityId: doc._id, before, after: docView(doc) })
      return doc
    },

      async remove(actor, id) {
      const doc = await find(id)
      const field = { Department: 'departmentId', Designation: 'designationId' }[Model.modelName]
      if (field && mongoose.models.Employee && (await mongoose.models.Employee.exists({ [field]: id })))
        throw new ApiError(409, `${entity} is in use by employees and cannot be deleted`)
      await doc.deleteOne()
      await logAudit({ actor, action: `${entity}.delete`, entity, entityId: id, before: docView(doc) })
    },
  }
}
