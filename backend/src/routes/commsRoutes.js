import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import * as comms from '../services/commsService.js'
import * as notes from '../services/notificationService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { idParams } from '../validators/common.js'
import { announcementBody, auditQuery } from '../validators/extraValidators.js'

export const announcementRoutes = Router()
announcementRoutes.use(authenticate())
announcementRoutes.get('/', asyncHandler(async (req, res) => sendSuccess(res, { data: await comms.listAnnouncements() })))
announcementRoutes.post('/', requireRole('admin', 'hr'), validate(announcementBody), asyncHandler(async (req, res) =>
  sendSuccess(res, { data: await comms.postAnnouncement(req.user, req.body), message: 'Announcement posted', status: 201 })))
announcementRoutes.delete('/:id', requireRole('admin', 'hr'), validate(idParams, 'params'), asyncHandler(async (req, res) => {
  await comms.deleteAnnouncement(req.user, req.params.id)
  sendSuccess(res, { message: 'Announcement deleted' })
}))

export const notificationRoutes = Router()
notificationRoutes.use(authenticate())
notificationRoutes.get('/', asyncHandler(async (req, res) => sendSuccess(res, { data: await notes.listMine(req.user) })))
notificationRoutes.patch('/read-all', asyncHandler(async (req, res) => { await notes.markAllRead(req.user); sendSuccess(res, {}) }))
notificationRoutes.patch('/:id/read', validate(idParams, 'params'), asyncHandler(async (req, res) => { await notes.markRead(req.user, req.params.id); sendSuccess(res, {}) }))

export const auditRoutes = Router()
auditRoutes.use(authenticate())
auditRoutes.get('/', requireRole('admin'), validate(auditQuery, 'query'), asyncHandler(async (req, res) => sendSuccess(res, { data: await comms.listAudit(req.query) })))
