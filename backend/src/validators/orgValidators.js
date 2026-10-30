import { z } from 'zod'
import { objectId, isoDate, hhmm, timezone, newEmail } from './common.js'

const name = z.string().trim().min(2, 'Name is required').max(80)

export const departmentCreate = z.object({ name }).strict()
export const departmentUpdate = departmentCreate.partial()

export const designationCreate = z.object({ name, departmentId: objectId.nullable().optional() }).strict()
export const designationUpdate = designationCreate.partial()

export const leaveTypeCreate = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z_]{2,20}$/, 'Use lowercase letters and underscores'),
  name,
  yearlyQuota: z.number().int().min(0).max(366).nullable(), // null = unlimited
  paid: z.boolean(),
}).strict()
export const leaveTypeUpdate = leaveTypeCreate.omit({ key: true }).partial()

export const holidayCreate = z.object({ date: isoDate, name }).strict()
export const holidayUpdate = holidayCreate.partial()

export const settingsUpdate = z.object({
  companyName: z.string().trim().min(2).max(100),
  timezone,
  officeStart: hhmm,
  graceMinutes: z.number().int().min(0).max(120),
  halfDayHours: z.number().min(1).max(12),
  hraRatePercent: z.number().min(0).max(200),
  medicalRatePercent: z.number().min(0).max(200),
  weekend: z.array(z.number().int().min(0).max(6)).max(6).refine((a) => new Set(a).size === a.length, 'Duplicate days'),
  office: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusM: z.number().int().min(10).max(5000),
  }).partial().strict(),
}).partial().strict()

export const createHr = z.object({
  name: z.string().trim().min(2).max(100),
  email: newEmail,
}).strict()

export const listUsersQuery = z.object({ role: z.enum(['admin', 'hr', 'employee']).optional() }).strict()

