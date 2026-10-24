import { z } from 'zod'
import { isoDate, objectId } from './common.js'

export const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM')
export const monthParams = z.object({ month }).strict()
export const monthBody = z.object({ month }).strict()
export const payslipQuery = z.object({ employeeId: objectId.optional() })

export const dashboardQuery = z.object({ from: isoDate.optional(), to: isoDate.optional(), departmentId: objectId.optional() })
export const announcementBody = z.object({ title: z.string().trim().min(3).max(120), body: z.string().trim().min(3).max(2000) }).strict()
export const auditQuery = z.object({ action: z.string().max(60).optional(), entity: z.string().max(40).optional(), page: z.string().regex(/^\d+$/).optional(), limit: z.string().regex(/^\d+$/).optional() })

export const chatBody = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) })).max(10).optional().default([]),
}).strict()
export const summaryBody = z.object({
  scope: z.enum(['hr', 'admin']),
  from: isoDate.optional(), to: isoDate.optional(), departmentId: objectId.optional(),
}).strict()
export const smartLeaveBody = z.object({ text: z.string().trim().min(3).max(500) }).strict()
