import { Router } from 'express'
import * as controller from '../controllers/settingsController.js'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { settingsUpdate } from '../validators/orgValidators.js'

const router = Router()
router.use(authenticate())
router.get('/', requireRole('admin', 'hr'), controller.get)
router.put('/', requireRole('admin'), validate(settingsUpdate), controller.update)

export default router
