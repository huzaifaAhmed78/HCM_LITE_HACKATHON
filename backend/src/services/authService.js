import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from './auditService.js'

export const hashPassword = (plain) => bcrypt.hash(plain, 10)

export function signToken(user) {
  return jwt.sign(
    { role: user.role, employeeId: user.employeeId ? String(user.employeeId) : null },
    env.jwtSecret,
    { subject: String(user._id), expiresIn: env.jwtExpiresIn }
  )
}

export async function login({ email, password }) {
  const user = await User.findOne({ email })
  const valid = user && user.isActive && (await bcrypt.compare(password, user.passwordHash))
  if (!valid) throw new ApiError(401, 'Invalid email or password') // same message for every failure

  user.lastLoginAt = new Date()
  await user.save()
  return { token: signToken(user), user }
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId)
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(422, 'Current password is incorrect', [{ field: 'currentPassword', message: 'Incorrect password' }])
  }
  if (currentPassword === newPassword) {
    throw new ApiError(422, 'New password must be different', [{ field: 'newPassword', message: 'Use a new password' }])
  }

  user.passwordHash = await hashPassword(newPassword)
  user.mustChangePassword = false
  await user.save()

  await logAudit({ actor: { id: user._id, role: user.role }, action: 'auth.change_password', entity: 'User', entityId: user._id })
  return { token: signToken(user), user }
}
