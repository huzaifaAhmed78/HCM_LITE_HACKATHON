import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// Checks the token, then loads the user from the database on every request,
// so deactivating a login takes effect immediately.
// A user with a temporary password can only use routes marked allowPasswordChange.
export const authenticate = ({ allowPasswordChange = false } = {}) =>
  asyncHandler(async (req, res, next) => {
    const [type, token] = (req.headers.authorization || '').split(' ')
    if (type !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required')

    let payload
    try {
      payload = jwt.verify(token, env.jwtSecret)
    } catch {
      throw new ApiError(401, 'Invalid or expired token')
    }

    const user = await User.findById(payload.sub)
    if (!user || !user.isActive) throw new ApiError(401, 'Account not found or deactivated')
    if (user.mustChangePassword && !allowPasswordChange) {
      throw new ApiError(403, 'You must change your temporary password first')
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      employeeId: user.employeeId ? String(user.employeeId) : null,
      name: user.name,
      email: user.email,
    }
    next()
  })
