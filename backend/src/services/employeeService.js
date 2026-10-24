import mongoose from 'mongoose'
import { Employee } from '../models/Employee.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { generateTempPassword } from '../utils/tempPassword.js'
import { employeeView } from '../views/employeeView.js'
import { hashPassword } from './authService.js'
import { logAudit } from './auditService.js'

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
    await user.deleteOne() // do not leave a login without an employee
    throw err
  }

  emp = await emp.populate(populate)
  await logAudit({ actor, action: 'employee.create', entity: 'Employee', entityId: emp._id, after: employeeView(emp) })
  return { employee: employeeView(emp), temporaryPassword }
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
  return { items: items.map(employeeView), total, page: p, pages: Math.ceil(total / l) }
}

// Employee 360: attendance, leave and payslips get added here in later modules
export async function getEmployee360(id) {
  return employeeView(await findEmployee(id))
}

export async function updateEmployee(actor, id, patch) {
  const emp = await findEmployee(id)
  await assertRefs(patch)
  const before = employeeView(emp)
  emp.set(patch)
  await emp.save()
  const userPatch = {}
  if (patch.status) userPatch.isActive = patch.status === 'active'
  if (patch.name) userPatch.name = patch.name
  if (Object.keys(userPatch).length) await User.findByIdAndUpdate(emp.userId, userPatch)
  const fresh = await findEmployee(id)
  await logAudit({ actor, action: 'employee.update', entity: 'Employee', entityId: emp._id, before, after: employeeView(fresh) })
  return employeeView(fresh)
}

export async function getMe(actor) {
  const emp = await Employee.findOne({ userId: actor.id }).populate(populate)
  if (!emp) throw new ApiError(404, 'Employee profile not found')
  return employeeView(emp)
}

export async function updateMe(actor, patch) {
  const emp = await Employee.findOne({ userId: actor.id }).populate(populate)
  if (!emp) throw new ApiError(404, 'Employee profile not found')
  const before = employeeView(emp)
  emp.set(patch)
  await emp.save()
  await logAudit({ actor, action: 'employee.update_self', entity: 'Employee', entityId: emp._id, before, after: employeeView(emp) })
  return employeeView(emp)
}