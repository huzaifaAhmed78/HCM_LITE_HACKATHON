import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import * as svc from '../services/payrollService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/apiResponse.js'
import * as v from '../validators/extraValidators.js'

const router = Router()
router.use(authenticate())

router.get('/runs', requireRole('hr', 'admin'), asyncHandler(async (req, res) => sendSuccess(res, { data: await svc.listRuns() })))
router.post('/runs', requireRole('hr'), validate(v.monthBody), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.createDraft(req.user, req.body.month), message: 'Draft created', status: 201 })))
router.get('/runs/:month', requireRole('hr', 'admin'), validate(v.monthParams, 'params'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.getRun(req.params.month) })))
router.post('/runs/:month/finalize', requireRole('admin'), validate(v.monthParams, 'params'), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await svc.finalize(req.user, req.params.month), message: 'Payroll finalized and locked' })))

router.get('/my', requireRole('employee'), asyncHandler(async (req, res) => sendSuccess(res, { data: await svc.myPayslips(req.user) })))
router.get('/payslip/:month', validate(v.monthParams, 'params'), validate(v.payslipQuery, 'query'), asyncHandler(async (req, res) => {
  const { pdf, filename } = await svc.payslipPdf(req.user, req.params.month, req.query.employeeId)
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': pdf.length })
  res.send(pdf)
}))

export default router
