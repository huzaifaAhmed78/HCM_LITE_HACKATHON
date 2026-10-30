import mongoose from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { docView } from '../views/docView.js'
import { logAudit } from './auditService.js'
import { Department } from '../models/Department.js'
import { Designation } from '../models/Designation.js'

// Small shared CRUD for simple setup lists (departments, designations, leave types, holidays).
// Every create / update / delete is written to the audit log with before and after.
// Things that must not be deleted while other records still use them.
const IN_USE = {
  Department: { model: 'Employee', field: 'departmentId', value: (d) => d._id, usedBy: 'employees' },
  Designation: { model: 'Employee', field: 'designationId', value: (d) => d._id, usedBy: 'employees' },
  LeaveType: { model: 'LeaveRequest', field: 'leaveTypeKey', value: (d) => d.key, usedBy: 'leave requests' },
}

async function ensureNotInUse(modelName, entity, doc) {
  const rule = IN_USE[modelName]
  const Other = rule && mongoose.models[rule.model]
  if (Other && (await Other.exists({ [rule.field]: rule.value(doc) }))) {
    throw new ApiError(409, `${entity} is used by ${rule.usedBy} and cannot be deleted`)
  }
}

const DEFAULT_DEPARTMENTS = ['Engineering', 'Information Technology', 'Human Resources', 'Finance', 'Marketing', 'Sales', 'Operations', 'Administration', 'Customer Support']
const DEFAULT_DESIGNATIONS = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'IT Support Engineer', 'Network Administrator', 'Cyber Security Analyst', 'HR Manager', 'Accountant', 'Marketing Executive', 'Sales Executive', 'Project Manager', 'System Administrator', 'Business Analyst', 'QA Engineer']

async function seedEmptySetupList(Model) {
  // Only seed a list when it is completely empty; never overwrite user-created records.
  if (await Model.estimatedDocumentCount() !== 0) return
  if (Model.modelName === 'Department') {
    await Model.insertMany(DEFAULT_DEPARTMENTS.map((name) => ({ name })), { ordered: false }).catch(() => {})
  } else if (Model.modelName === 'Designation') {
    await Model.insertMany(DEFAULT_DESIGNATIONS.map((name) => ({ name })), { ordered: false }).catch(() => {})
  }
}

export function makeCrudService({ Model, entity, sort, checkRefs = async () => {} }) {
  const find = async (id) => {
    const doc = await Model.findById(id)
    if (!doc) throw new ApiError(404, `${entity} not found`)
    return doc
  }

  return {
    list: async () => {
      await seedEmptySetupList(Model)
      return Model.find().sort(sort)
    },

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
      await ensureNotInUse(Model.modelName, entity, doc)
      await doc.deleteOne()
      await logAudit({ actor, action: `${entity}.delete`, entity, entityId: id, before: docView(doc) })
    },
  }
}
