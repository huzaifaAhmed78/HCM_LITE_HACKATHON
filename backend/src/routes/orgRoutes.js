import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { validate } from '../middleware/validate.js'
import { makeCrudController } from '../controllers/crudController.js'
import { departmentService, designationService, leaveTypeService, holidayService } from '../services/orgService.js'
import { idParams } from '../validators/common.js'
import * as v from '../validators/orgValidators.js'

// Admin and HR can read. Only Admin can change.
function crudRouter(service, label, createSchema, updateSchema) {
  const c = makeCrudController(service, label)
  const router = Router()
  router.use(authenticate())
  router.get('/', requireRole('admin', 'hr'), c.list)
  router.post('/', requireRole('admin'), validate(createSchema), c.create)
  router.put('/:id', requireRole('admin'), validate(idParams, 'params'), validate(updateSchema), c.update)
  router.delete('/:id', requireRole('admin'), validate(idParams, 'params'), c.remove)
  return router
}

export const departmentRoutes = crudRouter(departmentService, 'Department', v.departmentCreate, v.departmentUpdate)
export const designationRoutes = crudRouter(designationService, 'Designation', v.designationCreate, v.designationUpdate)
export const leaveTypeRoutes = crudRouter(leaveTypeService, 'Leave type', v.leaveTypeCreate, v.leaveTypeUpdate)
export const holidayRoutes = crudRouter(holidayService, 'Holiday', v.holidayCreate, v.holidayUpdate)
