import { Router } from 'express'
import * as controller from '../controllers/setupController.js'
import { validate } from '../middleware/validate.js'
import { firstRunSchema } from '../validators/authValidators.js'

const router = Router()
router.get('/status', controller.status)
router.post('/first-run', validate(firstRunSchema), controller.firstRun)

export default router
