import mongoose from 'mongoose'
import { Employee } from '../models/Employee.js'
import { User } from '../models/User.js'
import { Attendance } from '../models/Attendance.js'
import { AttendanceCorrection } from '../models/AttendanceCorrection.js'
import { LeaveRequest } from '../models/LeaveRequest.js'
import { FaceProfile } from '../models/FaceProfile.js'
import { Notification } from '../models/Notification.js'
import { PayrollRun } from '../models/PayrollRun.js'
import { ApiError } from '../utils/ApiError.js'
import { generateTempPassword } from '../utils/tempPassword.js'
import { employeeView } from '../views/employeeView.js'
import { hashPassword } from './authService.js'
import { logAudit } from './auditService.js'
import { getSettings } from './settingsService.js'

const salaryRates = async () => {
  const settings = await getSettings()
  return {
    hraRatePercent: Number.isFinite(settings.hraRatePercent) ? settings.hraRatePercent : 40,
    medicalRatePercent: Number.isFinite(settings.medicalRatePercent) ? settings.medicalRatePercent : 10,
  }
}

const populate = [
  { path: 'departmentId', select: 'name' },
  { path: 'designationId', select: 'name' },
]

async function assertRefs({ departmentId, designationId }) {
  const errors = []
  if (departmentId && !(await mongoose.model('Department').exists({ _id: departmentId })))
    errors.push({ field: 'departmentId', message: 'Department not found' })
  if (designationId && !(await mongoose.model('Designation').exists({ _id: designationId })))
    errors.push({ field: 'designationId', message: 'Designation not found' })
  if (errors.length) throw new ApiError(422, 'Validation failed', errors)
}

async function nextCode() {
  const last = await Employee.findOne().sort({ createdAt: -1 }).select('employeeCode')
  const n = last ? parseInt(last.employeeCode.slice(4), 10) + 1 : 1
  return `EMP-${String(n).padStart(4, '0')}`
}

const findEmployee = async (id) => {
  const emp = await Employee.findById(id).populate(populate)
  if (!emp) throw new ApiError(404, 'Employee not found')
  return emp
}

// HR registers an employee. Login is created with a temporary password, returned ONCE.
export async function createEmployee(actor, input) {
  const email = input.email.toLowerCase()
  if (await User.exists({ email })) throw new ApiError(409, 'Duplicate email')
  await assertRefs(input)

  const temporaryPassword = generateTempPassword()
  const _id = new mongoose.Types.ObjectId()
  const user = await User.create({
    name: input.name,
    email,
    passwordHash: await hashPassword(temporaryPassword),
    role: 'employee',
    employeeId: _id,
    mustChangePassword: true,
  })

  let emp
  try {
    emp = await Employee.create({
      _id,
      userId: user._id,
      employeeCode: await nextCode(),
      name: input.name,
      email,
      phone: input.phone,
      address: input.address,
      departmentId: input.departmentId,
      designationId: input.designationId,
      joiningDate: input.joiningDate,
      basic: input.basic,
    })
  } catch (err) {
    await user.deleteOne()
    throw err
  }

  emp = await emp.populate(populate)
  const rates = await salaryRates()
  await logAudit({ actor, action: 'employee.create', entity: 'Employee', entityId: emp._id, after: employeeView(emp, rates) })
  return { employee: employeeView(emp, rates), temporaryPassword }
}


const csvCell = (value) => {
  let text = value == null ? '' : String(value)
  // Prevent spreadsheet formula execution when exported text is opened in Excel/Sheets.
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  const input = String(text || '').replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === ',') { row.push(cell.trim()); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell.trim()); cell = ''
      if (row.some((v) => v !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  if (quoted) throw new ApiError(422, 'CSV contains an unclosed quoted field')
  row.push(cell.trim())
  if (row.some((v) => v !== '')) rows.push(row)
  if (rows.length < 2) throw new ApiError(422, 'CSV must include a header row and at least one employee row')
  const headers = rows.shift().map((h) => h.toLowerCase())
  const required = ['name', 'email', 'departmentid', 'designationid', 'basic']
  const missing = required.filter((h) => !headers.includes(h))
  if (missing.length) throw new ApiError(422, `Missing required CSV columns: ${missing.join(', ')}`)
  return rows.map((values, index) => {
    const data = Object.fromEntries(headers.map((h, i) => [h, values[i] || '']))
    return {
      row: index + 2,
      input: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || undefined,
        address: data.address || undefined,
        departmentId: data.departmentid,
        designationId: data.designationid,
        joiningDate: data.joiningdate || undefined,
        basic: Number(data.basic),
      },
    }
  })
}

async function validateCsvRows(rows) {
  const errors = []
  const seen = new Set()
  const valid = []
  for (const { row, input } of rows) {
    const rowErrors = []
    if (!input.name || input.name.length < 2 || input.name.length > 100) rowErrors.push('name must be 2-100 characters')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) rowErrors.push('email is invalid')
    if (!Number.isFinite(input.basic) || input.basic < 0) rowErrors.push('basic must be a non-negative number')
    if (!/^[a-f\d]{24}$/i.test(input.departmentId)) rowErrors.push('departmentId must be a valid ID')
    if (!/^[a-f\d]{24}$/i.test(input.designationId)) rowErrors.push('designationId must be a valid ID')
    if (input.joiningDate && Number.isNaN(Date.parse(input.joiningDate))) rowErrors.push('joiningDate must be a valid date')
    if (seen.has(input.email)) rowErrors.push('email is duplicated in this CSV')
    seen.add(input.email)
    if (await User.exists({ email: input.email })) rowErrors.push('email already exists')
    if (!rowErrors.length) {
      try { await assertRefs(input) } catch (err) { rowErrors.push(...(err.details || []).map((x) => x.message)) }
    }
    if (rowErrors.length) errors.push({ row, email: input.email, errors: rowErrors })
    else valid.push({ row, input })
  }
  return { valid, errors }
}

export async function importEmployeesCsv(actor, csv, dryRun = true) {
  if (typeof csv !== 'string' || csv.length > 2_000_000) throw new ApiError(422, 'CSV is required and must be under 2 MB')
  const rows = parseCsv(csv)
  const { valid, errors } = await validateCsvRows(rows)
  if (dryRun) return { dryRun: true, totalRows: rows.length, validRows: valid.length, errorRows: errors.length, errors }
  const imported = [], failed = [...errors]
  for (const item of valid) {
    try {
      const result = await createEmployee(actor, item.input)
      imported.push({ row: item.row, employeeCode: result.employee.employeeCode, email: result.employee.email, temporaryPassword: result.temporaryPassword })
    } catch (err) {
      failed.push({ row: item.row, email: item.input.email, errors: [err.message || 'Import failed'] })
    }
  }
  await logAudit({ actor, action: 'employee.csv_import', entity: 'Employee', after: { totalRows: rows.length, imported: imported.length, failed: failed.length } })
  return { dryRun: false, totalRows: rows.length, importedRows: imported.length, errorRows: failed.length, imported, errors: failed }
}

export async function exportEmployeesCsv(actor) {
  const [employees, settings] = await Promise.all([
    Employee.find().populate(populate).sort({ employeeCode: 1 }).lean(),
    getSettings(),
  ])
  const hraRatePercent = Number.isFinite(settings.hraRatePercent) ? settings.hraRatePercent : 40
  const medicalRatePercent = Number.isFinite(settings.medicalRatePercent) ? settings.medicalRatePercent : 10
  const headers = ['employeeCode', 'name', 'email', 'phone', 'address', 'departmentId', 'department', 'designationId', 'designation', 'joiningDate', 'basic', 'hra', 'medical', 'gross', 'status']
  const lines = [headers.join(',')]
  for (const e of employees) {
    const hra = Math.round(e.basic * hraRatePercent / 100 * 100) / 100
    const medical = Math.round(e.basic * medicalRatePercent / 100 * 100) / 100
    const vals = [
      e.employeeCode, e.name, e.email, e.phone, e.address, e.departmentId?._id || e.departmentId,
      e.departmentId?.name || '', e.designationId?._id || e.designationId, e.designationId?.name || '',
      e.joiningDate ? new Date(e.joiningDate).toISOString().slice(0, 10) : '', e.basic, hra, medical,
      Math.round((e.basic + hra + medical) * 100) / 100, e.status,
    ]
    lines.push(vals.map(csvCell).join(','))
  }
  await logAudit({ actor, action: 'employee.csv_export', entity: 'Employee', after: { exportedRows: employees.length } })
  return lines.join('\r\n')
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export async function listEmployees({ q, departmentId, designationId, status, page, limit }) {
  const p = Math.max(1, Number(page) || 1)
  const l = Math.min(50, Math.max(1, Number(limit) || 10))
  const filter = {}
  if (departmentId) filter.departmentId = departmentId
  if (designationId) filter.designationId = designationId
  if (status) filter.status = status
  if (q) {
    const re = new RegExp(escapeRe(String(q)), 'i')
    filter.$or = [{ name: re }, { email: re }, { employeeCode: re }]
  }
  const [items, total] = await Promise.all([
    Employee.find(filter).populate(populate).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
    Employee.countDocuments(filter),
  ])
  const rates = await salaryRates()
  return { items: items.map((item) => employeeView(item, rates)), total, page: p, pages: Math.ceil(total / l) }
}

// Employee 360: attendance, leave and payslips get added here in later modules
export async function getEmployee360(id) {
  const [emp, rates] = await Promise.all([findEmployee(id), salaryRates()])
  return employeeView(emp, rates)
}

export async function updateEmployee(actor, id, patch) {
  const emp = await findEmployee(id)
  await assertRefs(patch)
  const rates = await salaryRates()
  const before = employeeView(emp, rates)
  emp.set(patch)
  await emp.save()
  const userPatch = {}
  if (patch.status) userPatch.isActive = patch.status === 'active'
  if (patch.name) userPatch.name = patch.name
  if (Object.keys(userPatch).length) await User.findByIdAndUpdate(emp.userId, userPatch)
  const fresh = await findEmployee(id)
  await logAudit({ actor, action: 'employee.update', entity: 'Employee', entityId: emp._id, before, after: employeeView(fresh, rates) })
  if (Object.prototype.hasOwnProperty.call(patch, 'basic')) {
    await logAudit({ actor, action: 'employee.salary_update', entity: 'Employee', entityId: emp._id, before: { basic: before.salary?.basic }, after: { basic: fresh.basic, salary: employeeView(fresh, rates).salary } })
  }
  return employeeView(fresh, rates)
}

/*
 * Safety rule: don't erase employees whose attendance, leave, or payroll history exists.
 * Those records are needed for audit/payroll integrity. HR can deactivate such employees.
 * Employees without operational history can be permanently removed.
 */
export async function deleteEmployee(actor, id) {
  const emp = await Employee.findById(id)
  if (!emp) throw new ApiError(404, 'Employee not found')

  const employeeId = emp._id
  const [attendance, corrections, leaves, payroll] = await Promise.all([
    Attendance.exists({ employeeId }),
    AttendanceCorrection.exists({ employeeId }),
    LeaveRequest.exists({ employeeId }),
    PayrollRun.exists({ 'items.employeeId': employeeId }),
  ])

  if (attendance || corrections || leaves || payroll) {
    throw new ApiError(
      409,
      'This employee has attendance, leave, or payroll history. Deactivate the employee instead to preserve records.'
    )
  }

  const userId = emp.userId
  const before = employeeView(await Employee.findById(employeeId).populate(populate))

  await Promise.all([
    FaceProfile.deleteMany({ employeeId }),
    Notification.deleteMany({ userId }),
  ])
  await Employee.deleteOne({ _id: employeeId })
  await User.deleteOne({ _id: userId })

  await logAudit({
    actor,
    action: 'employee.delete',
    entity: 'Employee',
    entityId: String(employeeId),
    before,
  })

  return { message: 'Employee deleted successfully' }
}

export async function getMe(actor) {
  const emp = await Employee.findOne({ userId: actor.id }).populate(populate)
  if (!emp) throw new ApiError(404, 'Employee profile not found')
  return employeeView(emp, await salaryRates())
}

export async function updateMe(actor, patch) {
  const emp = await Employee.findOne({ userId: actor.id }).populate(populate)
  if (!emp) throw new ApiError(404, 'Employee profile not found')
  const rates = await salaryRates()
  const before = employeeView(emp, rates)
  emp.set(patch)
  await emp.save()
  await logAudit({ actor, action: 'employee.update_self', entity: 'Employee', entityId: emp._id, before, after: employeeView(emp, rates) })
  return employeeView(emp, rates)
}
