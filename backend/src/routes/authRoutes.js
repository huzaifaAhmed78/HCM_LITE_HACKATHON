import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as controller from '../controllers/authController.js'
import { authenticate } from '../middleware/authenticate.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, changePasswordSchema } from '../validators/authValidators.js'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again later.', errors: [] },
})

const router = Router()
router.post('/login', loginLimiter, validate(loginSchema), controller.login)
router.post('/change-password', authenticate({ allowPasswordChange: true }), validate(changePasswordSchema), controller.changePassword)
router.get('/me', authenticate({ allowPasswordChange: true }), controller.me)

export default router
