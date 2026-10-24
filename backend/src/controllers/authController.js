import * as authService from '../services/authService.js'
import { userView } from '../views/userView.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../models/User.js'

export const login = asyncHandler(async (req, res) => {
  const { token, user } = await authService.login(req.body)
  sendSuccess(res, { data: { token, user: userView(user) }, message: 'Logged in' })
})

export const changePassword = asyncHandler(async (req, res) => {
  const { token, user } = await authService.changePassword(req.user.id, req.body)
  sendSuccess(res, { data: { token, user: userView(user) }, message: 'Password changed' })
})

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  sendSuccess(res, { data: userView(user) })
})
