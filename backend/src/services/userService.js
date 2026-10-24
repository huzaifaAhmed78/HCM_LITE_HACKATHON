import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { generateTempPassword } from '../utils/tempPassword.js'
import { userView } from '../views/userView.js'
import { hashPassword } from './authService.js'
import { logAudit } from './auditService.js'

export const listUsers = ({ role }) => User.find(role ? { role } : {}).sort({ createdAt: -1 }).limit(200)

async function findUser(id) {
  const user = await User.findById(id)
  if (!user) throw new ApiError(404, 'User not found')
  return user
}

// Admin creates an HR login. The temporary password is returned ONCE and never stored or logged in plain text.
export async function createHr(actor, { name, email }) {
  const temporaryPassword = generateTempPassword()
  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(temporaryPassword),
    role: 'hr',
    mustChangePassword: true,
  })
  await logAudit({ actor, action: 'user.create_hr', entity: 'User', entityId: user._id, after: userView(user) })
  return { user, temporaryPassword }
}

export async function setActive(actor, id, isActive) {
  if (id === actor.id) throw new ApiError(422, 'You cannot change your own login')
  const user = await findUser(id)
  const before = userView(user)
  user.isActive = isActive
  await user.save()
  await logAudit({ actor, action: isActive ? 'user.activate' : 'user.deactivate', entity: 'User', entityId: user._id, before, after: userView(user) })
  return user
}

export async function resetPassword(actor, id) {
  if (id === actor.id) throw new ApiError(422, 'Use Change Password for your own login')
  const user = await findUser(id)
  const temporaryPassword = generateTempPassword()
  user.passwordHash = await hashPassword(temporaryPassword)
  user.mustChangePassword = true
  await user.save()
  await logAudit({ actor, action: 'user.reset_password', entity: 'User', entityId: user._id })
  return { user, temporaryPassword }
}
