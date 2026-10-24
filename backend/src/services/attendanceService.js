import { Attendance } from '../models/Attendance.js'
import { AttendanceCorrection } from '../models/AttendanceCorrection.js'
import { Employee } from '../models/Employee.js'
import { FaceProfile } from '../models/FaceProfile.js'
import { Holiday } from '../models/Holiday.js'
import { LeaveRequest } from '../models/LeaveRequest.js'
import { ApiError } from '../utils/ApiError.js'
import { distanceMeters, eachDate, hhmmToMinutes, localParts, localToDate, monthRange, todayIn } from '../utils/dateUtils.js'
import { logAudit } from './auditService.js'
import { notifyEmployee, notifyRole } from './notificationService.js'
import { getSettings } from './settingsService.js'

// ---- Rules (from Settings; changes apply to NEW records only) ----
// late     : check-in after officeStart + graceMinutes
// half_day : worked less than halfDayHours when checking out (overrides late)
// absent   : working day (not weekend/holiday/approved leave), in the past, with no record. Computed, not stored.
export function computeStatus(settings, checkIn, checkOut) {
  const tz = settings.timezone
  const inMin = localParts(checkIn, tz).minutes
  let status = inMin > hhmmToMinutes(settings.officeStart) + settings.graceMinutes ? 'late' : 'present'
  let workedMinutes = 0
  if (checkOut) {
    workedMinutes = Math.max(0, Math.round((checkOut - checkIn) / 60000))
    if (workedMinutes < settings.halfDayHours * 60) status = 'half_day'
  }
  return { status, workedMinutes }
}

// Face check. If the employee has enrolled a face, every check-in and check-out must match it.
// If nobody is enrolled yet, the normal button flow still works.
const FACE_THRESHOLD = 0.5 // Euclidean distance between 128-number face descriptors; lower = stricter
async function verifyFace(employeeId, descriptor) {
  const profile = await FaceProfile.findOne({ employeeId })
  if (!profile) return null
  if (!descriptor) throw new ApiError(422, 'Face scan is required', [{ field: 'descriptor', message: 'Scan your face' }])
  const distance = Math.sqrt(profile.descriptor.reduce((sum, v, i) => sum + (v - descriptor[i]) ** 2, 0))
  if (distance > FACE_THRESHOLD) throw new ApiError(422, 'Face not recognised. Try again in good light.', [{ field: 'descriptor', message: 'Face does not match' }])
  return Math.round(distance * 1000) / 1000
}

function checkLocation(settings, { lat, lng }) {
  const o = settings.office || {}
  if (o.lat == null || o.lng == null) return { lat: lat ?? null, lng: lng ?? null, distanceM: null } // geofence not configured
  if (lat == null || lng == null) throw new ApiError(422, 'Location is required to check in', [{ field: 'lat', message: 'Allow location access' }])
  const distanceM = distanceMeters(o.lat, o.lng, lat, lng)
  if (distanceM > o.radiusM) throw new ApiError(422, `You are ${distanceM} m from the office (allowed ${o.radiusM} m)`, [{ field: 'lat', message: 'Outside office radius' }])
  return { lat, lng, distanceM }
}

const view = (a) => a && {
  id: String(a._id), employeeId: String(a.employeeId), date: a.date, checkIn: a.checkIn, checkOut: a.checkOut,
  status: a.status, workedMinutes: a.workedMinutes, source: a.source, location: a.location,
}

export async function checkIn(actor, { lat, lng, descriptor }) {
  const settings = await getSettings()
  const date = todayIn(settings.timezone)
  const employeeId = actor.employeeId
  if (await Attendance.exists({ employeeId, date })) throw new ApiError(409, 'You have already checked in today')
  const faceDistance = await verifyFace(employeeId, descriptor)
  const location = checkLocation(settings, { lat, lng })
  const now = new Date()
  const { status } = computeStatus(settings, now, null)
  const rec = await Attendance.create({ employeeId, date, checkIn: now, status, location, faceDistance })
  await logAudit({ actor, action: 'attendance.check_in', entity: 'Attendance', entityId: rec._id, after: view(rec) })
  return view(rec)
}

export async function checkOut(actor, { descriptor } = {}) {
  const settings = await getSettings()
  const date = todayIn(settings.timezone)
  const rec = await Attendance.findOne({ employeeId: actor.employeeId, date })
  if (!rec) throw new ApiError(409, 'You have not checked in today')
  if (rec.checkOut) throw new ApiError(409, 'You have already checked out today')
  await verifyFace(actor.employeeId, descriptor)
  const before = view(rec)
  rec.checkOut = new Date()
  Object.assign(rec, computeStatus(settings, rec.checkIn, rec.checkOut))
  await rec.save()
  await logAudit({ actor, action: 'attendance.check_out', entity: 'Attendance', entityId: rec._id, before, after: view(rec) })
  return view(rec)
}

export async function today(actor) {
  const settings = await getSettings()
  const date = todayIn(settings.timezone)
  const rec = await Attendance.findOne({ employeeId: actor.employeeId, date })
  return { date, record: view(rec) }
}

async function context(start, end) {
  const [holidays, leaves] = await Promise.all([
    Holiday.find({ date: { $gte: start, $lte: end } }),
    LeaveRequest.find({ status: 'approved', startDate: { $lte: end }, endDate: { $gte: start } }),
  ])
  return { holidays: new Map(holidays.map((h) => [h.date, h.name])), leaves }
}

function dayStatus({ date, rec, settings, today: t, holidays, leaves, joinDate }) {
  if (rec) return rec.status
  if (joinDate && date < joinDate) return null
  if (settings.weekend.includes(localParts(new Date(`${date}T12:00:00Z`), 'UTC').weekday)) return 'weekend'
  if (holidays.has(date)) return 'holiday'
  if (leaves.some((l) => l.startDate <= date && l.endDate >= date)) return 'leave'
  if (date >= t) return 'upcoming'
  return 'absent'
}

// Calendar for one employee and one month (YYYY-MM)
export async function monthView(employeeId, month) {
  const settings = await getSettings()
  const { start, end } = monthRange(month)
  const emp = await Employee.findById(employeeId).select('joiningDate name employeeCode')
  if (!emp) throw new ApiError(404, 'Employee not found')
  const [recs, { holidays, leaves: all }] = await Promise.all([Attendance.find({ employeeId, date: { $gte: start, $lte: end } }), context(start, end)])
  const leaves = all.filter((l) => String(l.employeeId) === String(employeeId))
  const byDate = new Map(recs.map((r) => [r.date, r]))
  const t = todayIn(settings.timezone)
  const joinDate = emp.joiningDate ? localParts(emp.joiningDate, settings.timezone).date : null
  const days = eachDate(start, end).map((date) => {
    const rec = byDate.get(date)
    return {
      date,
      status: dayStatus({ date, rec, settings, today: t, holidays, leaves, joinDate }),
      holiday: holidays.get(date) || null,
      checkIn: rec?.checkIn || null,
      checkOut: rec?.checkOut || null,
      workedMinutes: rec?.workedMinutes || 0,
    }
  })
  const summary = { present: 0, late: 0, half_day: 0, absent: 0, leave: 0 }
  for (const d of days) if (d.status in summary) summary[d.status] += 1
  return { employee: { id: String(emp._id), name: emp.name, employeeCode: emp.employeeCode }, month, days, summary }
}

// Daily board: every active employee for one date
export async function dailyBoard(date) {
  const settings = await getSettings()
  const day = date || todayIn(settings.timezone)
  const [emps, recs, { holidays, leaves }] = await Promise.all([
    Employee.find({ status: 'active' }).select('name employeeCode joiningDate departmentId').populate('departmentId', 'name').sort({ name: 1 }),
    Attendance.find({ date: day }),
    context(day, day),
  ])
  const byEmp = new Map(recs.map((r) => [String(r.employeeId), r]))
  const t = todayIn(settings.timezone)
  const rows = emps.map((e) => {
    const rec = byEmp.get(String(e._id))
    const joinDate = e.joiningDate ? localParts(e.joiningDate, settings.timezone).date : null
    const mine = leaves.filter((l) => String(l.employeeId) === String(e._id))
    return {
      employeeId: String(e._id), name: e.name, employeeCode: e.employeeCode, department: e.departmentId?.name || '',
      status: dayStatus({ date: day, rec, settings, today: t, holidays, leaves: mine, joinDate }),
      checkIn: rec?.checkIn || null, checkOut: rec?.checkOut || null, workedMinutes: rec?.workedMinutes || 0,
    }
  })
  const summary = { present: 0, late: 0, half_day: 0, absent: 0, leave: 0, not_yet: 0 }
  for (const r of rows) {
    if (r.status in summary) summary[r.status] += 1
    else if (r.status === 'upcoming') summary.not_yet += 1
  }
  return { date: day, holiday: holidays.get(day) || null, rows, summary }
}

// ---- Corrections ----
export async function requestCorrection(actor, input) {
  const settings = await getSettings()
  if (input.date > todayIn(settings.timezone)) throw new ApiError(422, 'Cannot correct a future date', [{ field: 'date', message: 'Date is in the future' }])
  if (input.checkOut && hhmmToMinutes(input.checkOut) <= hhmmToMinutes(input.checkIn))
    throw new ApiError(422, 'Check-out must be after check-in', [{ field: 'checkOut', message: 'Must be after check-in' }])
  if (await AttendanceCorrection.exists({ employeeId: actor.employeeId, date: input.date, status: 'pending' }))
    throw new ApiError(409, 'You already have a pending correction for this date')
  const doc = await AttendanceCorrection.create({ ...input, employeeId: actor.employeeId })
  await logAudit({ actor, action: 'attendance.correction_request', entity: 'AttendanceCorrection', entityId: doc._id, after: doc.toObject() })
  await notifyRole('hr', { title: 'Attendance correction requested', message: `${actor.name} requested a correction for ${input.date}.`, link: '/attendance-board' })
  return doc
}

export async function listCorrections(actor, { status }) {
  const filter = actor.role === 'employee' ? { employeeId: actor.employeeId } : {}
  if (status) filter.status = status
  return AttendanceCorrection.find(filter).populate('employeeId', 'name employeeCode').sort({ createdAt: -1 }).limit(200)
}

export async function decideCorrection(actor, id, approve, note = '') {
  const corr = await AttendanceCorrection.findById(id)
  if (!corr) throw new ApiError(404, 'Correction not found')
  if (corr.status !== 'pending') throw new ApiError(409, `Correction is already ${corr.status}`)
  const before = corr.toObject()
  if (approve) {
    const settings = await getSettings()
    const checkInAt = localToDate(corr.date, corr.checkIn, settings.timezone)
    const checkOutAt = corr.checkOut ? localToDate(corr.date, corr.checkOut, settings.timezone) : null
    const { status, workedMinutes } = computeStatus(settings, checkInAt, checkOutAt)
    const prev = await Attendance.findOne({ employeeId: corr.employeeId, date: corr.date })
    const rec = await Attendance.findOneAndUpdate(
      { employeeId: corr.employeeId, date: corr.date },
      { $set: { checkIn: checkInAt, checkOut: checkOutAt, status, workedMinutes, source: 'correction' } },
      { upsert: true, new: true }
    )
    await logAudit({ actor, action: 'attendance.correct', entity: 'Attendance', entityId: rec._id, before: view(prev), after: view(rec) })
  }
  corr.status = approve ? 'approved' : 'rejected'
  corr.decidedBy = actor.id
  corr.decidedAt = new Date()
  corr.note = note
  await corr.save()
  await logAudit({ actor, action: approve ? 'attendance.correction_approve' : 'attendance.correction_reject', entity: 'AttendanceCorrection', entityId: corr._id, before, after: corr.toObject() })
  await notifyEmployee(corr.employeeId, { title: `Correction ${approve ? 'approved' : 'rejected'}`, message: `Your attendance correction for ${corr.date} was ${approve ? 'approved' : 'rejected'}.${note ? ` Comment: ${note}` : ''}`, link: '/attendance' })
  return corr
}
