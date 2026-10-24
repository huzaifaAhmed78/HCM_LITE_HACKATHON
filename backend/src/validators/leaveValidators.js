import { z } from 'zod'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

export const leaveApply = z.object({
  leaveTypeKey: z.string().trim().min(1),
  startDate: date,
  endDate: date,
  reason: z.string().trim().max(300).optional().default(''),
})
export const leaveList = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  employeeId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
})
export const yearQuery = z.object({ year: z.string().regex(/^\d{4}$/).optional() })
export { decision } from './attendanceValidators.js'
