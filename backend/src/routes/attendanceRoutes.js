import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import * as svc from '../services/attendanceService.js'
import * as face from '../services/faceService.js'
import { getSettings } from '../services/settingsService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { todayIn } from '../utils/dateUtils.js'
import { idParams } from '../validators/common.js'
import * as v from '../validators/attendanceValidators.js'

const router = Router()
router.use(authenticate())

const currentMonth = async () => (todayIn((await getSettings()).timezone)).slice(0, 7)

// Employee
router.post('/check-in', requireRole('employee'), validate(v.checkInBody), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.checkIn(req.user, req.body), message: 'Checked in', status: 201 })))
router.post('/check-out', requireRole('employee'), validate(v.checkOutBody), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.checkOut(req.user, req.body), message: 'Checked out' })))
router.get('/today', requireRole('employee'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.today(req.user) })))
router.get('/me', requireRole('employee'), validate(v.monthQuery, 'query'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.monthView(req.user.employeeId, req.query.month || (await currentMonth())) })))

// Face enrollment: employee enrolls once for themself, HR can enroll or replace for anyone
router.get('/face/status', requireRole('employee'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await face.status(req.user.employeeId) })))
router.post('/face/enroll', requireRole('employee'), validate(v.faceBody), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await face.enroll(req.user, req.user.employeeId, req.body.descriptor, false), message: 'Face registered', status: 201 })))
router.post('/face/enroll/:id', requireRole('hr'), validate(idParams, 'params'), validate(v.faceBody), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await face.enroll(req.user, req.params.id, req.body.descriptor, true), message: 'Face registered', status: 201 })))

// Corrections: employee requests, HR decides, everyone sees what they are allowed to
router.post('/corrections', requireRole('employee'), validate(v.correctionCreate), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.requestCorrection(req.user, req.body), message: 'Correction requested', status: 201 })))
router.get('/corrections', validate(v.correctionList, 'query'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.listCorrections(req.user, req.query) })))
router.patch('/corrections/:id/approve', requireRole('hr'), validate(idParams, 'params'), validate(v.decision), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.decideCorrection(req.user, req.params.id, true, req.body.note), message: 'Approved' })))
router.patch('/corrections/:id/reject', requireRole('hr'), validate(idParams, 'params'), validate(v.decision), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.decideCorrection(req.user, req.params.id, false, req.body.note), message: 'Rejected' })))

// HR / Admin
router.get('/board', requireRole('hr', 'admin'), validate(v.boardQuery, 'query'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.dailyBoard(req.query.date) })))
router.get('/employee/:id', requireRole('hr', 'admin'), validate(idParams, 'params'), validate(v.monthQuery, 'query'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.monthView(req.params.id, req.query.month || (await currentMonth())) })))

export default router
