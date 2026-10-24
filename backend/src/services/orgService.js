import { Department } from '../models/Department.js'
import { Designation } from '../models/Designation.js'
import { LeaveType } from '../models/LeaveType.js'
import { Holiday } from '../models/Holiday.js'
import { ApiError } from '../utils/ApiError.js'
import { makeCrudService } from './crudService.js'

export const departmentService = makeCrudService({ Model: Department, entity: 'Department', sort: { name: 1 } })

export const designationService = makeCrudService({
  Model: Designation,
  entity: 'Designation',
  sort: { name: 1 },
  checkRefs: async (data) => {
    if (data.departmentId && !(await Department.exists({ _id: data.departmentId }))) {
      throw new ApiError(422, 'Department not found', [{ field: 'departmentId', message: 'Unknown department' }])
    }
  },
})

export const leaveTypeService = makeCrudService({ Model: LeaveType, entity: 'LeaveType', sort: { name: 1 } })
export const holidayService = makeCrudService({ Model: Holiday, entity: 'Holiday', sort: { date: 1 } })

// Policy defaults from the brief. Admin can edit the quotas. Created once at first-run.
const DEFAULT_LEAVE_TYPES = [
  { key: 'annual', name: 'Annual', yearlyQuota: 14, paid: true },
  { key: 'sick', name: 'Sick', yearlyQuota: 8, paid: true },
  { key: 'casual', name: 'Casual', yearlyQuota: 10, paid: true },
  { key: 'unpaid', name: 'Unpaid', yearlyQuota: null, paid: false },
]

export async function seedDefaultLeaveTypes() {
  await LeaveType.bulkWrite(
    DEFAULT_LEAVE_TYPES.map((t) => ({ updateOne: { filter: { key: t.key }, update: { $setOnInsert: t }, upsert: true } }))
  )
}
