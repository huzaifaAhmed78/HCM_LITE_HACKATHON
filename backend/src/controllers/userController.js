import * as userService from '../services/userService.js'
import { userView } from '../views/userView.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: (await userService.listUsers(req.query)).map(userView) })
})

export const createHr = asyncHandler(async (req, res) => {
  const { user, temporaryPassword } = await userService.createHr(req.user, req.body)
  sendSuccess(res, { data: { user: userView(user), temporaryPassword }, message: 'HR login created', status: 201 })
})

export const deactivate = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: userView(await userService.setActive(req.user, req.params.id, false)), message: 'Login deactivated' })
})

export const activate = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: userView(await userService.setActive(req.user, req.params.id, true)), message: 'Login activated' })
})

export const resetPassword = asyncHandler(async (req, res) => {
  const { user, temporaryPassword } = await userService.resetPassword(req.user, req.params.id)
  sendSuccess(res, { data: { user: userView(user), temporaryPassword }, message: 'Temporary password issued' })
})
