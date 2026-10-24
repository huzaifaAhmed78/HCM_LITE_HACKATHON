import mongoose from 'mongoose'
import { Attendance } from '../models/Attendance.js'
import { AttendanceCorrection } from '../models/AttendanceCorrection.js'
import { AuditLog } from '../models/AuditLog.js'
import { Department } from '../models/Department.js'
import { Designation } from '../models/Designation.js'
import { Employee } from '../models/Employee.js'
import { LeaveRequest } from '../models/LeaveRequest.js'
import { PayrollRun } from '../models/PayrollRun.js'
import { localParts, todayIn } from '../utils/dateUtils.js'
import { salaryOf } from '../views/employeeView.js'
import * as leaves from './leaveService.js'
import { getSettings } from './settingsService.js'
import { employeeStats, totalsOf } from './statsService.js'

const oid = (s) => new mongoose.Types.ObjectId(s)
const r1 = (n) => Math.round(n * 10) / 10
const r2 = (n) => Math.round(n * 100) / 100

export async function activeEmployees({ departmentId, employeeId } = {}) {
  const f = { status: 'active' }
  if (departmentId) f.departmentId = oid(departmentId)
  if (employeeId) f._id = oid(employeeId)
  return Employee.find(f).select('name employeeCode joiningDate departmentId designationId basic').lean()
}

const deptNames = async () => new Map((await Department.find().lean()).map((d) => [String(d._id), d.name]))

// ---------- Attendance summary (used by the HR dashboard AND the AI tools) ----------
export async function attendanceSummary(employees, from, to) {
  const res = await employeeStats(employees, from, to)
  return { ...res, totals: totalsOf(res.stats, employees.map((e) => e._id)) }
}

export async function topLateComers(employees, stats, limit = 5) {
  const dn = await deptNames()
  return employees
    .map((e) => ({ employeeId: String(e._id), name: e.name, employeeCode: e.employeeCode, department: dn.get(String(e.departmentId)) || '', lates: stats.get(String(e._id))?.late || 0 }))
    .filter((x) => x.lates > 0)
    .sort((a, b) => b.lates - a.lates || a.name.localeCompare(b.name))
    .slice(0, limit)
}

// Approved leave days per leave type inside the range (working days only)
function leaveByType(leaveDocs, types, dates, ids) {
  const set = new Set(ids.map(String))
  const counts = new Map()
  for (const l of leaveDocs) {
    if (!set.has(String(l.employeeId))) continue
    const n = dates.filter((d) => d >= l.startDate && d <= l.endDate).length
    counts.set(l.leaveTypeKey, (counts.get(l.leaveTypeKey) || 0) + n)
  }
  return types.map((t) => ({ key: t.key, name: t.name, days: counts.get(t.key) || 0 })).filter((x) => x.days > 0)
}

const monthStart = (d) => `${d.slice(0, 7)}-01`

function resolveRange({ from, to }, today, defaultFrom) {
  return { from: from || defaultFrom, to: to || today }
}

// ---------- HR dashboard ----------
export async function hrDashboard({ from, to, departmentId } = {}) {
  const settings = await getSettings()
  const today = todayIn(settings.timezone)
  const range = resolveRange({ from, to }, today, monthStart(today))
  const employees = await activeEmployees({ departmentId })
  const ids = employees.map((e) => e._id)
  const dn = await deptNames()

  const sum = await attendanceSummary(employees, range.from, range.to)
  const { stats, dates, totals } = sum

  // today's KPIs
  const [todayAgg, onLeaveToday, pendingLeaves, pendingCorr] = await Promise.all([
    Attendance.aggregate([
      { $match: { employeeId: { $in: ids }, date: today } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    LeaveRequest.distinct('employeeId', { employeeId: { $in: ids }, status: 'approved', startDate: { $lte: today }, endDate: { $gte: today } }),
    LeaveRequest.countDocuments({ employeeId: { $in: ids }, status: 'pending' }),
    AttendanceCorrection.countDocuments({ employeeId: { $in: ids }, status: 'pending' }),
  ])
  const t = Object.fromEntries(todayAgg.map((x) => [x._id, x.n]))
  const checkedInToday = (t.present || 0) + (t.late || 0) + (t.half_day || 0)

  // daily trend (database aggregation by date + status)
  const trendDates = dates.filter((d) => d <= today).slice(-31)
  const trendAgg = await Attendance.aggregate([
    { $match: { employeeId: { $in: ids }, date: { $gte: range.from, $lte: range.to } } },
    { $group: { _id: { d: '$date', s: '$status' }, n: { $sum: 1 } } },
  ])
  const byDate = new Map()
  for (const x of trendAgg) {
    const row = byDate.get(x._id.d) || { present: 0, late: 0, half_day: 0 }
    row[x._id.s] = x.n
    byDate.set(x._id.d, row)
  }
  const joinOf = new Map(employees.map((e) => [String(e._id), e.joiningDate ? localParts(new Date(e.joiningDate), settings.timezone).date : '0000-00-00']))
  const trend = trendDates.map((date) => {
    const r = byDate.get(date) || { present: 0, late: 0, half_day: 0 }
    const joined = [...joinOf.values()].filter((j) => j <= date).length
    const onLeave = new Set(sum.leaves.filter((l) => l.startDate <= date && l.endDate >= date).map((l) => String(l.employeeId))).size
    const absent = date < today ? Math.max(0, joined - r.present - r.late - r.half_day - onLeave) : 0
    return { date, ...r, leave: onLeave, absent }
  })

  // absenteeism by department
  const groups = new Map()
  for (const e of employees) {
    const key = String(e.departmentId)
    const g = groups.get(key) || { department: dn.get(key) || 'Unassigned', headcount: 0, absentDays: 0, expectedDays: 0, late: 0, present: 0 }
    const s = stats.get(String(e._id))
    g.headcount += 1; g.absentDays += s.absent; g.expectedDays += s.expectedDays; g.late += s.late; g.present += s.present
    groups.set(key, g)
  }
  const absenteeismByDept = [...groups.values()].map((g) => ({
    department: g.department, headcount: g.headcount, absentDays: g.absentDays, expectedDays: g.expectedDays,
    absenteeismPercent: g.expectedDays ? r1((g.absentDays / g.expectedDays) * 100) : 0,
    latePercent: g.present + g.late ? r1((g.late / (g.present + g.late)) * 100) : 0,
  })).sort((a, b) => b.absenteeismPercent - a.absenteeismPercent)

  return {
    filters: { from: range.from, to: range.to, departmentId: departmentId || null },
    kpis: {
      headcount: employees.length,
      presentToday: checkedInToday,
      onLeaveToday: onLeaveToday.length,
      lateToday: t.late || 0,
      pendingApprovals: pendingLeaves + pendingCorr,
      pendingLeaves, pendingCorrections: pendingCorr,
    },
    attendance: {
      attendanceRatePercent: totals.attendanceRate, latePercent: totals.latePercent, absenteeismPercent: totals.absenteeismRate,
      presentDays: totals.present, lateDays: totals.late, halfDays: totals.half_day, absentDays: totals.absent,
    },
    trend,
    absenteeismByDept,
    leaveByType: leaveByType(sum.leaves, sum.types, dates, ids),
    topLateComers: await topLateComers(employees, stats, 5),
  }
}

// ---------- Admin dashboard ----------
export async function adminDashboard({ from, to, departmentId } = {}) {
  const settings = await getSettings()
  const today = todayIn(settings.timezone)
  const range = resolveRange({ from, to }, today, `${today.slice(0, 4)}-01-01`)
  const match = { status: 'active', ...(departmentId ? { departmentId: oid(departmentId) } : {}) }
  const [dn, designations] = await Promise.all([deptNames(), Designation.find().lean()])
  const desigName = new Map(designations.map((d) => [String(d._id), d.name]))

  const fromDate = new Date(`${range.from}T00:00:00Z`)
  const toDate = new Date(`${range.to}T23:59:59Z`)
  const deptFilter = departmentId ? { departmentId: oid(departmentId) } : {}

  const [byDeptAgg, avgDeptAgg, avgDesigAgg, overallAgg, exits, joins, runs, tenureAgg, audit] = await Promise.all([
    Employee.aggregate([{ $match: match }, { $group: { _id: '$departmentId', n: { $sum: 1 } } }]),
    Employee.aggregate([{ $match: match }, { $group: { _id: '$departmentId', avgBasic: { $avg: '$basic' }, n: { $sum: 1 } } }]),
    Employee.aggregate([{ $match: match }, { $group: { _id: '$designationId', avgBasic: { $avg: '$basic' }, n: { $sum: 1 } } }]),
    Employee.aggregate([{ $match: match }, { $group: { _id: null, avgBasic: { $avg: '$basic' }, n: { $sum: 1 } } }]),
    Employee.countDocuments({ ...deptFilter, status: 'inactive', updatedAt: { $gte: fromDate, $lte: toDate } }),
    Employee.countDocuments({ ...deptFilter, joiningDate: { $gte: fromDate, $lte: toDate } }),
    PayrollRun.find({ status: 'finalized', month: { $gte: range.from.slice(0, 7), $lte: range.to.slice(0, 7) } }).sort({ month: 1 }).lean(),
    Employee.aggregate([
      { $match: match },
      { $project: { years: { $divide: [{ $subtract: [new Date(`${today}T12:00:00Z`), '$joiningDate'] }, 31557600000] } } },
      { $bucket: { groupBy: '$years', boundaries: [-100, 1, 3, 5, 100], default: 'other', output: { n: { $sum: 1 } } } },
    ]),
    AuditLog.find().sort({ at: -1 }).limit(8).lean(),
  ])

  const headcount = overallAgg[0]?.n || 0
  const startHeadcount = Math.max(0, headcount + exits - joins) // approximation: no history table
  const avgHeadcount = (startHeadcount + headcount) / 2

  // payroll cost from finalized runs
  const costByDept = new Map()
  const byMonth = []
  for (const run of runs) {
    let gross = 0, net = 0
    for (const i of run.items) {
      if (departmentId && String(i.departmentId) !== departmentId) continue
      gross += i.earnedGross; net += i.net
      const key = i.department || 'Unassigned'
      const c = costByDept.get(key) || { department: key, gross: 0, net: 0 }
      c.gross += i.earnedGross; c.net += i.net
      costByDept.set(key, c)
    }
    byMonth.push({ month: run.month, gross: r2(gross), net: r2(net) })
  }

  const labels = ['Under 1 year', '1 to 3 years', '3 to 5 years', '5+ years']
  const tenure = [-100, 1, 3, 5].map((b, i) => ({ bucket: labels[i], count: tenureAgg.find((x) => x._id === b)?.n || 0 }))
  const grossOf = (b) => r2(salaryOf(b || 0).gross)

  return {
    filters: { from: range.from, to: range.to, departmentId: departmentId || null },
    kpis: {
      headcount,
      attritionPercent: avgHeadcount ? r1((exits / avgHeadcount) * 100) : 0,
      exits,
      payrollCostGross: r2(byMonth.reduce((a, m) => a + m.gross, 0)),
      payrollCostNet: r2(byMonth.reduce((a, m) => a + m.net, 0)),
      payrollMonths: byMonth.length,
      averageSalary: grossOf(overallAgg[0]?.avgBasic),
    },
    headcountByDept: byDeptAgg.map((x) => ({ department: dn.get(String(x._id)) || 'Unassigned', count: x.n })).sort((a, b) => b.count - a.count),
    payrollCostByDept: [...costByDept.values()].map((c) => ({ department: c.department, gross: r2(c.gross), net: r2(c.net) })).sort((a, b) => b.gross - a.gross),
    payrollByMonth: byMonth,
    averageSalaryByDept: avgDeptAgg.map((x) => ({ department: dn.get(String(x._id)) || 'Unassigned', averageGross: grossOf(x.avgBasic), count: x.n })),
    averageSalaryByDesignation: avgDesigAgg.map((x) => ({ designation: desigName.get(String(x._id)) || 'Unassigned', averageGross: grossOf(x.avgBasic), count: x.n })),
    tenure,
    auditFeed: audit.map((a) => ({ id: String(a._id), at: a.at, actorRole: a.actorRole, action: a.action, entity: a.entity })),
  }
}

// ---------- Employee dashboard ----------
export async function meDashboard(actor) {
  const settings = await getSettings()
  const today = todayIn(settings.timezone)
  const now = localParts(new Date(), settings.timezone)
  // Monday of this week
  const monday = new Date(`${today}T00:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - ((now.weekday + 6) % 7))
  const weekStart = monday.toISOString().slice(0, 10)
  const eid = oid(actor.employeeId)

  const [weekRecs, lateCount, balance, lastRun, todayRec] = await Promise.all([
    Attendance.find({ employeeId: eid, date: { $gte: weekStart, $lte: today } }).lean(),
    Attendance.countDocuments({ employeeId: eid, status: 'late', date: { $gte: monthStart(today), $lte: today } }),
    leaves.balances(actor.employeeId),
    PayrollRun.findOne({ status: 'finalized', 'items.employeeId': eid }).sort({ month: -1 }).lean(),
    Attendance.findOne({ employeeId: eid, date: today }).lean(),
  ])
  let minutes = weekRecs.reduce((a, r) => a + (r.workedMinutes || 0), 0)
  // today's open session counts live
  const open = weekRecs.find((r) => r.date === today && !r.checkOut)
  if (open) minutes += Math.max(0, Math.round((Date.now() - new Date(open.checkIn)) / 60000))
  const mine = lastRun?.items.find((i) => String(i.employeeId) === actor.employeeId)

  return {
    today: todayRec ? { status: todayRec.status, checkIn: todayRec.checkIn, checkOut: todayRec.checkOut } : null,
    hoursThisWeek: { minutes, targetMinutes: 40 * 60 },
    lateCountThisMonth: lateCount,
    leaveBalance: balance,
    lastPayslip: mine ? { month: lastRun.month, net: mine.net, gross: mine.earnedGross } : null,
  }
}
