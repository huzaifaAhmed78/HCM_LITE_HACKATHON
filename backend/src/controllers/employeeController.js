import { asyncHandler } from '../utils/asyncHandler.js'
import * as service from '../services/employeeService.js'

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data })

export const create = asyncHandler(async (req, res) => ok(res, await service.createEmployee(req.user, req.body), 201))
export const list = asyncHandler(async (req, res) => ok(res, await service.listEmployees(req.query)))
export const get = asyncHandler(async (req, res) => ok(res, await service.getEmployee360(req.params.id)))
export const update = asyncHandler(async (req, res) => ok(res, await service.updateEmployee(req.user, req.params.id, req.body)))
export const remove = asyncHandler(async (req, res) => {
  const result = await service.deleteEmployee(req.user, req.params.id)
  return ok(res, result)
})
export const me = asyncHandler(async (req, res) => ok(res, await service.getMe(req.user)))
export const updateMe = asyncHandler(async (req, res) => ok(res, await service.updateMe(req.user, req.body)))


export const importCsv = asyncHandler(async (req, res) => {
  const result = await service.importEmployeesCsv(req.user, req.body.csv, req.body.dryRun !== false)
  return ok(res, result, 200)
})
export const exportCsv = asyncHandler(async (req, res) => {
  const csv = await service.exportEmployeesCsv(req.user)
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="employees.csv"',
    'Cache-Control': 'no-store',
  })
  res.send('\uFEFF' + csv)
})
