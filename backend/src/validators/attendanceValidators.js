import { z } from 'zod'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)')

const descriptor = z.array(z.number().finite()).length(128, 'Invalid face data')
export const faceBody = z.object({ descriptor })
export const checkInBody = z.object({ lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional(), descriptor: descriptor.optional() })
export const checkOutBody = z.object({ descriptor: descriptor.optional() })
export const monthQuery = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM').optional() })
export const boardQuery = z.object({ date: date.optional() })
export const correctionCreate = z.object({ date, checkIn: time, checkOut: time.optional(), reason: z.string().trim().min(3, 'Give a reason').max(300) })
export const correctionList = z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() })
export const decision = z.object({ note: z.string().trim().max(300).optional() })
