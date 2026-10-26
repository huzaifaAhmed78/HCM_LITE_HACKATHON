import { z } from 'zod'
import { newEmail } from './common.js'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
const phone = z.string().trim().min(5).max(20)

export const createEmployee = z.object({
  name: z.string().trim().min(2).max(100),
  email: newEmail,
  phone: phone.optional(),
  address: z.string().trim().max(300).optional(),
  departmentId: objectId,
  designationId: objectId,
  joiningDate: z.coerce.date().optional(),
  basic: z.number().min(0),
})

export const updateEmployee = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone,
    address: z.string().trim().max(300),
    departmentId: objectId,
    designationId: objectId,
    joiningDate: z.coerce.date(),
    status: z.enum(['active', 'inactive']),
    basic: z.number().min(0),
  })
  .partial()
  .strict()

// Employee can only change these two
export const updateMe = z
  .object({ phone: phone.or(z.literal('')), address: z.string().trim().max(300) })
  .partial()
  .strict()
