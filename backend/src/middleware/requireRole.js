import { ApiError } from '../utils/ApiError.js'

// Usage: router.post('/x', authenticate(), requireRole('admin', 'hr'), controller)
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw new ApiError(403, 'You do not have access to this resource')
  next()
}
