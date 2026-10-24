import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import * as ai from '../services/aiService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { chatBody, smartLeaveBody, summaryBody } from '../validators/extraValidators.js'

const router = Router()
router.use(authenticate())

router.post('/chat', validate(chatBody), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await ai.chat(req.user, req.body.message, req.body.history) })))
router.post('/summary', requireRole('hr', 'admin'), validate(summaryBody), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await ai.summarize(req.user, req.body) })))
router.post('/smart-leave', requireRole('employee'), validate(smartLeaveBody), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await ai.smartLeave(req.user, req.body.text) })))

export default router
