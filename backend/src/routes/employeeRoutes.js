import { Router } from 'express'
import * as controller from '../controllers/employeeController.js'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { idParams } from '../validators/common.js'
import { createEmployee, updateEmployee, updateMe } from '../validators/employeeValidators.js'

const router = Router()
router.use(authenticate())

// Employee: own profile (must be before /:id)
router.get('/me', requireRole('employee'), controller.me)
router.patch('/me', requireRole('employee'), validate(updateMe), controller.updateMe)

// HR manages, Admin can view
router.get('/export.csv', requireRole('hr', 'admin'), controller.exportCsv)
router.post('/import.csv', requireRole('hr'), controller.importCsv)
router.post('/', requireRole('hr'), validate(createEmployee), controller.create)
router.get('/', requireRole('hr', 'admin'), controller.list)

// Keep DELETE before the generic /:id routes.
router.delete('/:id', requireRole('hr'), validate(idParams, 'params'), controller.remove)
router.get('/:id', requireRole('hr', 'admin'), validate(idParams, 'params'), controller.get)
router.patch('/:id', requireRole('hr'), validate(idParams, 'params'), validate(updateEmployee), controller.update)

export default router
