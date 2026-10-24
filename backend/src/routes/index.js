import { Router } from 'express'
import authRoutes from './authRoutes.js'
import setupRoutes from './setupRoutes.js'
import settingsRoutes from './settingsRoutes.js'
import userRoutes from './userRoutes.js'
import { departmentRoutes, designationRoutes, leaveTypeRoutes, holidayRoutes } from './orgRoutes.js'
import employeeRoutes from './employeeRoutes.js'
import attendanceRoutes from './attendanceRoutes.js'
import leaveRoutes from './leaveRoutes.js'
import payrollRoutes from './payrollRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import aiRoutes from './aiRoutes.js'
import { announcementRoutes, notificationRoutes, auditRoutes } from './commsRoutes.js'

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
router.use('/attendance', attendanceRoutes)
router.use('/leaves', leaveRoutes)
router.use('/payroll', payrollRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/ai', aiRoutes)
router.use('/announcements', announcementRoutes)
router.use('/notifications', notificationRoutes)
router.use('/audit', auditRoutes)

export default router
