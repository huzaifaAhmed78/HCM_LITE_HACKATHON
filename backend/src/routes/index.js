import { Router } from 'express'
import authRoutes from './authRoutes.js'
import setupRoutes from './setupRoutes.js'
import settingsRoutes from './settingsRoutes.js'
import userRoutes from './userRoutes.js'
import { departmentRoutes, designationRoutes, leaveTypeRoutes, holidayRoutes } from './orgRoutes.js'
import employeeRoutes from './employeeRoutes.js'

// Each new module adds one line here.
const router = Router()
router.use('/auth', authRoutes)
router.use('/setup', setupRoutes)
router.use('/settings', settingsRoutes)
router.use('/users', userRoutes)
router.use('/departments', departmentRoutes)
router.use('/designations', designationRoutes)
router.use('/leave-types', leaveTypeRoutes)
router.use('/holidays', holidayRoutes)
router.use('/employees', employeeRoutes)

export default router
