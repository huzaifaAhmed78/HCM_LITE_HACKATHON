import { Employee } from '../models/Employee.js'
import { FaceProfile } from '../models/FaceProfile.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from './auditService.js'

export async function status(employeeId) {
  return { enrolled: Boolean(await FaceProfile.exists({ employeeId })) }
}

// byHr = true can replace an existing face; employees can only enroll once for themself.
export async function enroll(actor, employeeId, descriptor, byHr) {
  if (!(await Employee.exists({ _id: employeeId, status: 'active' }))) throw new ApiError(404, 'Active employee not found')
  const existing = await FaceProfile.findOne({ employeeId })
  if (existing && !byHr) throw new ApiError(409, 'Face is already registered. Ask HR to replace it.')
  await FaceProfile.findOneAndUpdate({ employeeId }, { $set: { descriptor, enrolledBy: actor.id } }, { upsert: true })
  // never write the face template into the audit log
  await logAudit({ actor, action: existing ? 'face.replace' : 'face.enroll', entity: 'Employee', entityId: employeeId })
  return { enrolled: true }
}
