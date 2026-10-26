import { z } from 'zod'
import { emailProblem } from '../utils/emailCheck.js'

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
export const idParams = z.object({ id: objectId }).strict()

// YYYY-MM-DD and a real calendar date (rejects 2026-02-30)
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
  }, 'Not a real date')

export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM')

export const timezone = z.string().refine((tz) => {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false }
}, 'Unknown timezone')


// Email for new accounts: valid format AND not an obvious typo such as ".con" or "gmial.com".
// Not used for login, so older accounts can always sign in.
export const newEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email')
  .superRefine((value, ctx) => {
    const problem = emailProblem(value)
    if (problem) ctx.addIssue({ code: 'custom', message: problem })
  })
