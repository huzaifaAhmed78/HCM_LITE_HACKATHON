import { asyncHandler } from '../utils/asyncHandler.js'
import * as service from '../services/employeeService.js'

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data })

export const create = asyncHandler(async (req, res) => ok(res, await service.createEmployee(req.user, req.body), 201))
export const list = asyncHandler(async (req, res) => ok(res, await service.listEmployees(req.query)))
export const get = asyncHandler(async (req, res) => ok(res, await service.getEmployee360(req.params.id)))
export const update = asyncHandler(async (req, res) => ok(res, await service.updateEmployee(req.user, req.params.id, req.body)))
export const me = asyncHandler(async (req, res) => ok(res, await service.getMe(req.user)))
export const updateMe = asyncHandler(async (req, res) => ok(res, await service.updateMe(req.user, req.body)))