import * as setupService from '../services/setupService.js'
import { env } from '../config/env.js'
import { userView } from '../views/userView.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const status = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await setupService.getSetupStatus() })
})

export const firstRun = asyncHandler(async (req, res) => {
  const { token, user } = await setupService.firstRun({ timezone: env.defaultTimezone, ...req.body })
  sendSuccess(res, { data: { token, user: userView(user) }, message: 'Company created', status: 201 })
})
