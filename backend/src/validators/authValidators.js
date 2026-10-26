import { z } from 'zod'
import { timezone, newEmail } from './common.js'

const password = z.string().min(8, 'Password must be at least 8 characters').max(72)

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
}).strict()

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
}).strict()

export const firstRunSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name is required').max(100),
  timezone: timezone.optional(),
  adminName: z.string().trim().min(2, 'Admin name is required').max(100),
  email: newEmail,
  password,
}).strict()

