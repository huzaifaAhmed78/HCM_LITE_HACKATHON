import { Employee } from '../models/Employee.js'
import { PayrollRun } from '../models/PayrollRun.js'
import { ApiError } from '../utils/ApiError.js'
import { monthRange, todayIn } from '../utils/dateUtils.js'
import { buildPdf } from '../utils/pdf.js'
import { salaryOf } from '../views/employeeView.js'
import { logAudit } from './auditService.js'
import { notifyEmployees } from './notificationService.js'
import { getSettings } from './settingsService.js'
import { employeeStats } from './statsService.js'

const r2 = (n) => Math.round(n * 100) / 100

// Annual tax slab (illustrative, from the brief). Applied to gross x 12.
export function annualTax(annual) {
  if (annual <= 600000) return 0
  if (annual <= 1200000) return (annual - 600000) * 0.05
  if (annual <= 2400000) return 30000 + (annual - 1200000) * 0.15
  if (annual <= 3600000) return 210000 + (annual - 2400000) * 0.25
  return 510000 + (annual - 3600000) * 0.35
}

// Pure payslip maths (unit tested).
//  perDay    = gross / working days in the month
//  deduction = (absent + unpaid + 0.5 x half days) x perDay
//  joiners   = gross, deduction base and tax are prorated by eligibleDays / workingDays
export function computePayslip({ basic, workingDays, eligibleDays, absentDays, unpaidLeaveDays, halfDays, hraRatePercent = 40, medicalRatePercent = 10 }) {
  const values = { basic, workingDays, eligibleDays, absentDays, unpaidLeaveDays, halfDays, hraRatePercent, medicalRatePercent }
  for (const [field, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new ApiError(422, `Invalid payroll value: ${field}`, [{ field, message: 'Must be a non-negative number' }])
    }
  }
  if (eligibleDays > workingDays) throw new ApiError(422, 'Eligible days cannot exceed working days')
  if (absentDays + unpaidLeaveDays + halfDays * 0.5 > eligibleDays) {
    throw new ApiError(422, 'Attendance deductions exceed eligible working days')
  }
  const { hra, medical, gross } = salaryOf(basic, { hraRatePercent, medicalRatePercent })
  const perDay = workingDays > 0 ? gross / workingDays : 0
  const factor = workingDays > 0 ? eligibleDays / workingDays : 0
  const earnedGross = gross * factor
  const deduction = perDay * (absentDays + unpaidLeaveDays + 0.5 * halfDays)
  const tax = (annualTax(gross * 12) / 12) * factor
  return {
    basic, hra, medical, gross,
    perDay: r2(perDay), earnedGross: r2(earnedGross), deduction: r2(deduction), tax: r2(tax),
    net: r2(earnedGross - deduction - tax),
  }
}

const monthNow = async () => todayIn((await getSettings()).timezone).slice(0, 7)

export async function createDraft(actor, month) {
  if (month > (await monthNow())) throw new ApiError(422, 'Cannot run payroll for a future month', [{ field: 'month', message: 'Month is in the future' }])
  const existing = await PayrollRun.findOne({ month })
  if (existing?.status === 'finalized') throw new ApiError(409, `Payroll for ${month} is finalized and locked`)

  const settings = await getSettings()
  const hraRatePercent = Number.isFinite(settings.hraRatePercent) ? settings.hraRatePercent : 40
  const medicalRatePercent = Number.isFinite(settings.medicalRatePercent) ? settings.medicalRatePercent : 10
  const { start, end } = monthRange(month)
  const employees = await Employee.find({ status: 'active' })
    .populate('departmentId', 'name').populate('designationId', 'name').sort({ employeeCode: 1 }).lean()
  const { stats, dates } = await employeeStats(employees, start, end)

  const items = []
  for (const e of employees) {
    const s = stats.get(String(e._id))
    if (!s || s.eligibleDays === 0) continue // joined after this month
    const pay = computePayslip({
      basic: e.basic, workingDays: dates.length, eligibleDays: s.eligibleDays,
      absentDays: s.absent, unpaidLeaveDays: s.unpaidLeaveDays, halfDays: s.half_day, hraRatePercent, medicalRatePercent,
    })
    items.push({
      employeeId: e._id, employeeCode: e.employeeCode, name: e.name,
      departmentId: e.departmentId?._id || null, department: e.departmentId?.name || '', designation: e.designationId?.name || '',
      joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString().slice(0, 10) : '',
      workingDays: dates.length, eligibleDays: s.eligibleDays,
      absentDays: s.absent, unpaidLeaveDays: s.unpaidLeaveDays, halfDays: s.half_day, hraRatePercent, medicalRatePercent,
      ...pay,
    })
  }
  if (!items.length) throw new ApiError(422, 'No active employees to pay for this month')

  const totals = {
    employees: items.length,
    gross: r2(items.reduce((a, i) => a + i.earnedGross, 0)),
    deduction: r2(items.reduce((a, i) => a + i.deduction, 0)),
    tax: r2(items.reduce((a, i) => a + i.tax, 0)),
    net: r2(items.reduce((a, i) => a + i.net, 0)),
  }
  const before = existing ? { status: existing.status, totals: existing.totals } : null
  const run = await PayrollRun.findOneAndUpdate(
    { month, status: 'draft' }, // a finalized run can never match this filter
    { $set: { workingDays: dates.length, items, totals, createdBy: actor.id, calculationAssumptions: { hraRatePercent, medicalRatePercent, taxPolicy: 'Illustrative annual gross-income slabs applied to gross x 12; monthly tax prorated by eligible/working days.', deductionPolicy: 'Gross divided by working days; absent + unpaid leave + 0.5 per half-day.' } } },
    { upsert: true, new: true }
  )
  await logAudit({ actor, action: existing ? 'payroll.redraft' : 'payroll.draft', entity: 'PayrollRun', entityId: run._id, before, after: { month, status: 'draft', totals } })
  return run
}

export async function finalize(actor, month) {
  const run = await PayrollRun.findOne({ month })
  if (!run) throw new ApiError(404, `No payroll draft for ${month}`)
  if (run.status === 'finalized') throw new ApiError(409, `Payroll for ${month} is already finalized`)
  const before = { status: run.status, totals: run.totals }
  const done = await PayrollRun.findOneAndUpdate(
    { _id: run._id, status: 'draft' },
    { status: 'finalized', finalizedBy: actor.id, finalizedAt: new Date() },
    { new: true }
  )
  if (!done) throw new ApiError(409, `Payroll for ${month} is already finalized`)
  await logAudit({ actor, action: 'payroll.finalize', entity: 'PayrollRun', entityId: run._id, before, after: { month, status: 'finalized', totals: done.totals } })
  await notifyEmployees(done.items.map((i) => i.employeeId), { title: 'Payslip ready', message: `Your payslip for ${month} is available.`, link: '/payslips' })
  return done
}

export const listRuns = () =>
  PayrollRun.find().select('month status workingDays totals finalizedAt createdAt').sort({ month: -1 }).lean()

export async function getRun(month) {
  const run = await PayrollRun.findOne({ month }).lean()
  if (!run) throw new ApiError(404, `No payroll run for ${month}`)
  return run
}

// An employee only ever sees finalized runs, and only their own line.
export async function myPayslips(actor) {
  const runs = await PayrollRun.find({ status: 'finalized', 'items.employeeId': actor.employeeId }).sort({ month: -1 }).lean()
  return runs.map((r) => ({ month: r.month, finalizedAt: r.finalizedAt, ...r.items.find((i) => String(i.employeeId) === String(actor.employeeId)) }))
}

export async function payrollSummary(month) {
  const run = await PayrollRun.findOne({ month }).lean()
  if (!run) return null
  return { month, status: run.status, employees: run.totals.employees, totalGross: run.totals.gross, totalDeductions: run.totals.deduction, totalTax: run.totals.tax, totalNet: run.totals.net }
}

export async function payslipPdf(actor, month, employeeId) {
  const isStaff = actor.role !== 'employee'
  const targetId = isStaff ? employeeId : actor.employeeId
  if (!targetId) throw new ApiError(422, 'employeeId is required')
  const run = await PayrollRun.findOne({ month }).lean()
  if (!run || (!isStaff && run.status !== 'finalized')) throw new ApiError(404, 'Payslip not found')
  const item = run.items.find((i) => String(i.employeeId) === String(targetId))
  if (!item) throw new ApiError(404, 'Payslip not found')
  const settings = await getSettings()
  await logAudit({ actor, action: 'payslip.download', entity: 'PayrollRun', entityId: run._id, after: { month, employeeId: String(targetId) } })

  const money = (n) => `Rs ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const L = 50, R = 545
  const rows = []
  let y = 700
  const row = (label, value, bold = false) => { rows.push({ text: label, x: L, y, size: 10, bold }, { text: value, x: R - 130, y, size: 10, bold }); y -= 18 }
  const head = (t) => { rows.push({ rect: [L, y - 4, R - L, 18], }, { text: t, x: L + 6, y, size: 10, bold: true }); y -= 24 }

  const items = [
    { text: settings.companyName, x: L, y: 790, size: 20, bold: true },
    { text: `Payslip for ${month}${run.status === 'draft' ? '  (DRAFT, not final)' : ''}`, x: L, y: 768, size: 12 },
    { line: [L, 756, R, 756] },
    { text: `Employee: ${item.name}`, x: L, y: 734, size: 11, bold: true },
    { text: `Code: ${item.employeeCode}`, x: 340, y: 734, size: 10 },
    { text: `Department: ${item.department || '-'}`, x: L, y: 718, size: 10 },
    { text: `Designation: ${item.designation || '-'}`, x: 340, y: 718, size: 10 },
  ]
  y = 684
  head('Earnings')
  row('Basic', money(item.basic)); row(`House rent allowance (${run.calculationAssumptions?.hraRatePercent ?? 40}%)`, money(item.hra)); row(`Medical allowance (${run.calculationAssumptions?.medicalRatePercent ?? 10}%)`, money(item.medical))
  row('Gross (monthly)', money(item.gross), true)
  if (item.eligibleDays !== item.workingDays) row(`Prorated gross (${item.eligibleDays} of ${item.workingDays} working days)`, money(item.earnedGross), true)
  y -= 8
  head('Deductions')
  row(`Absent days: ${item.absentDays}`, money(item.absentDays * item.perDay))
  row(`Unpaid leave days: ${item.unpaidLeaveDays}`, money(item.unpaidLeaveDays * item.perDay))
  row(`Half days: ${item.halfDays} (half a day each)`, money(item.halfDays * 0.5 * item.perDay))
  row('Total attendance deduction', money(item.deduction), true)
  row('Income tax (monthly share of annual slab)', money(item.tax), true)
  y -= 8
  rows.push({ line: [L, y + 10, R, y + 10] })
  y -= 6
  rows.push({ text: 'NET PAY', x: L, y, size: 14, bold: true }, { text: money(item.net), x: R - 160, y, size: 14, bold: true })
  y -= 40
  rows.push({ text: `Per day rate: ${money(item.perDay)}  |  Working days in month: ${item.workingDays}`, x: L, y, size: 8 })
  rows.push({ text: 'Computer generated payslip. Tax slab is illustrative.', x: L, y: y - 14, size: 8 })
  rows.push({ text: `Assumptions: HRA ${run.calculationAssumptions?.hraRatePercent ?? 40}%, medical ${run.calculationAssumptions?.medicalRatePercent ?? 10}%; tax on annual gross slabs, prorated for eligible days.`, x: L, y: y - 26, size: 7 })
  return { pdf: buildPdf([...items, ...rows]), filename: `payslip-${item.employeeCode}-${month}.pdf` }
}
