import * as settingsService from '../services/settingsService.js'
import { docView } from '../views/docView.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const get = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: docView(await settingsService.getSettings()) })
})

export const update = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.user, req.body)
  sendSuccess(res, { data: docView(settings), message: 'Settings updated' })
})
