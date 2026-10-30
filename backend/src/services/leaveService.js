import { Employee } from '../models/Employee.js'
import { Holiday } from '../models/Holiday.js'
import { LeaveRequest } from '../models/LeaveRequest.js'
import { LeaveType } from '../models/LeaveType.js'
import { ApiError } from '../utils/ApiError.js'
import { eachDate, localParts, todayIn } from '../utils/dateUtils.js'
import { logAudit } from './auditService.js'
import { notifyEmployee, notifyRole } from './notificationService.js'
import { getSettings } from './settingsService.js'

// Working days = not weekend and not a holiday
async function workingDays(settings, start, end) {
  const holidays = new Set((await Holiday.find({ date: { $gte: start, $lte: end } })).map((h) => h.date))
  return eachDate(start, end).filter((d) => !settings.weekend.includes(localParts(new Date(`${d}T12:00:00Z`), 'UTC').weekday) && !holidays.has(d))
}

export async function balances(employeeId, year) {
  const y = String(year || new Date().getUTCFullYear())
  const [types, reqs] = await Promise.all([
    LeaveType.find().sort({ name: 1 }),
    LeaveRequest.find({ employeeId, status: { $in: ['approved', 'pending'] }, startDate: { $gte: `${y}-01-01`, $lte: `${y}-12-31` } }),
  ])
  return types.map((t) => {
    const mine = reqs.filter((r) => r.leaveTypeKey === t.key)
    const used = mine.filter((r) => r.status === 'approved').reduce((s, r) => s + r.days, 0)
    const pending = mine.filter((r) => r.status === 'pending').reduce((s, r) => s + r.days, 0)
    return {
      key: t.key, name: t.name, paid: t.paid, quota: t.yearlyQuota, used, pending,
      remaining: t.yearlyQuota == null ? null : t.yearlyQuota - used - pending,
    }
  })
}

export async function apply(actor, { leaveTypeKey, startDate, endDate, reason }) {
  const settings = await getSettings()
  const employeeId = actor.employeeId
  const type = await LeaveType.findOne({ key: leaveTypeKey.toLowerCase() })
  if (!type) throw new ApiError(422, 'Unknown leave type', [{ field: 'leaveTypeKey', message: 'Unknown leave type' }])
  if (endDate < startDate) throw new ApiError(422, 'End date is before start date', [{ field: 'endDate', message: 'Must not be before start date' }])
  if (startDate.slice(0, 4) !== endDate.slice(0, 4)) throw new ApiError(422, 'Split leave that crosses a year into two requests', [{ field: 'endDate', message: 'Same year only' }])
  if (endDate < todayIn(settings.timezone)) throw new ApiError(422, 'Cannot apply for dates in the past', [{ field: 'startDate', message: 'Date is in the past' }])

  const overlap = await LeaveRequest.findOne({ employeeId, status: { $in: ['pending', 'approved'] }, startDate: { $lte: endDate }, endDate: { $gte: startDate } })
  if (overlap) throw new ApiError(422, `Overlaps your ${overlap.status} leave (${overlap.startDate} to ${overlap.endDate})`)

  const days = (await workingDays(settings, startDate, endDate)).length
  if (days === 0) throw new ApiError(422, 'These dates are all weekends or holidays, no leave needed', [{ field: 'startDate', message: 'No working days in range' }])

  if (type.yearlyQuota != null) {
    const b = (await balances(employeeId, startDate.slice(0, 4))).find((x) => x.key === type.key)
    if (days > b.remaining) throw new ApiError(422, `Not enough ${type.name} leave: ${b.remaining} day(s) left, you asked for ${days}`, [{ field: 'leaveTypeKey', message: 'Insufficient balance' }])
  }

  const doc = await LeaveRequest.create({ employeeId, leaveTypeKey: type.key, startDate, endDate, days, reason })
  await logAudit({ actor, action: 'leave.apply', entity: 'LeaveRequest', entityId: doc._id, after: doc.toObject() })
  await notifyRole('hr', { title: 'New leave request', message: `${actor.name} asked for ${days} day(s) of ${type.name} leave (${startDate} to ${endDate}).`, link: '/leave-requests' })
  return doc
}

export async function list(actor, { status, employeeId }) {
  const filter = actor.role === 'employee' ? { employeeId: actor.employeeId } : employeeId ? { employeeId } : {}
  if (status) filter.status = status
  return LeaveRequest.find(filter).populate('employeeId', 'name employeeCode').sort({ createdAt: -1 }).limit(200)
}

export async function decide(actor, id, approve, note = '') {
  const req = await LeaveRequest.findById(id)
  if (!req) throw new ApiError(404, 'Leave request not found')
  if (req.status !== 'pending') throw new ApiError(409, `Request is already ${req.status}`)
  if (approve) {
    const type = await LeaveType.findOne({ key: req.leaveTypeKey })
    if (type?.yearlyQuota != null) {
      const b = (await balances(req.employeeId, req.startDate.slice(0, 4))).find((x) => x.key === type.key)
      // this request's own days are already counted in "pending"
      if (b.remaining < 0) throw new ApiError(422, 'Employee no longer has enough balance for this leave')
    }
  }
  const before = req.toObject()
  req.status = approve ? 'approved' : 'rejected'
  req.decidedBy = actor.id
  req.decidedAt = new Date()
  req.note = note
  await req.save()
  await logAudit({ actor, action: approve ? 'leave.approve' : 'leave.reject', entity: 'LeaveRequest', entityId: req._id, before, after: req.toObject() })
  await notifyEmployee(req.employeeId, { title: `Leave ${approve ? 'approved' : 'rejected'}`, message: `Your ${req.leaveTypeKey} leave (${req.startDate} to ${req.endDate}) was ${approve ? 'approved' : 'rejected'}.${note ? ` Comment: ${note}` : ''}`, link: '/leave' })
  return req
}

export async function cancel(actor, id) {
  const req = await LeaveRequest.findOne({ _id: id, employeeId: actor.employeeId })
  if (!req) throw new ApiError(404, 'Leave request not found')
  if (req.status !== 'pending') throw new ApiError(409, 'Only pending requests can be cancelled')
  const before = req.toObject()
  req.status = 'cancelled'
  await req.save()
  await logAudit({ actor, action: 'leave.cancel', entity: 'LeaveRequest', entityId: req._id, before, after: req.toObject() })
  await notifyRole('hr', { title: 'Leave request cancelled', message: `${actor.name} cancelled the pending ${req.leaveTypeKey} leave request (${req.startDate} to ${req.endDate}).`, link: '/leave-requests' })
  return req
}

export async function employeeExists(id) {
  if (!(await Employee.exists({ _id: id }))) throw new ApiError(404, 'Employee not found')
}
