import { Router } from 'express'
import * as controller from '../controllers/userController.js'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { idParams } from '../validators/common.js'
import { createHr, listUsersQuery } from '../validators/orgValidators.js'

// Admin only
const router = Router()
router.use(authenticate(), requireRole('admin'))
router.get('/', validate(listUsersQuery, 'query'), controller.list)
router.post('/hr', validate(createHr), controller.createHr)
router.patch('/:id/deactivate', validate(idParams, 'params'), controller.deactivate)
router.patch('/:id/activate', validate(idParams, 'params'), controller.activate)
router.post('/:id/reset-password', validate(idParams, 'params'), controller.resetPassword)

export default router
