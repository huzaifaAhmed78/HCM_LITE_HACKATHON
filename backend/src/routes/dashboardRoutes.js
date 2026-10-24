import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import * as svc from '../services/analyticsService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { dashboardQuery } from '../validators/extraValidators.js'

const router = Router()
router.use(authenticate())

router.get('/hr', requireRole('hr', 'admin'), validate(dashboardQuery, 'query'), asyncHandler(async (req, res) => sendSuccess(res, { data: await svc.hrDashboard(req.query) })))
router.get('/admin', requireRole('admin'), validate(dashboardQuery, 'query'), asyncHandler(async (req, res) => sendSuccess(res, { data: await svc.adminDashboard(req.query) })))
router.get('/me', requireRole('employee'), asyncHandler(async (req, res) => sendSuccess(res, { data: await svc.meDashboard(req.user) })))

export default router
