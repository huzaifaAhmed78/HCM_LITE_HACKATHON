import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import * as svc from '../services/leaveService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { idParams } from '../validators/common.js'
import * as v from '../validators/leaveValidators.js'

const router = Router()
router.use(authenticate())

router.post('/', requireRole('employee'), validate(v.leaveApply), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.apply(req.user, req.body), message: 'Leave requested', status: 201 })))
router.get('/', validate(v.leaveList, 'query'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.list(req.user, req.query) })))

// before /:id routes
router.get('/balance', requireRole('employee'), validate(v.yearQuery, 'query'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.balances(req.user.employeeId, req.query.year) })))
router.get('/balance/:id', requireRole('hr', 'admin'), validate(idParams, 'params'), validate(v.yearQuery, 'query'), asyncHandler(async (req, res) => {
  await svc.employeeExists(req.params.id)
  sendSuccess(res, { data: await svc.balances(req.params.id, req.query.year) })
}))

router.patch('/:id/approve', requireRole('hr'), validate(idParams, 'params'), validate(v.decision), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.decide(req.user, req.params.id, true, req.body.note), message: 'Approved' })))
router.patch('/:id/reject', requireRole('hr'), validate(idParams, 'params'), validate(v.decision), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.decide(req.user, req.params.id, false, req.body.note), message: 'Rejected' })))
router.patch('/:id/cancel', requireRole('employee'), validate(idParams, 'params'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.cancel(req.user, req.params.id), message: 'Cancelled' })))

export default router
