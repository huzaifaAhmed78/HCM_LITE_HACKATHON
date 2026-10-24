import { Attendance } from '../models/Attendance.js'
import { Holiday } from '../models/Holiday.js'
import { LeaveRequest } from '../models/LeaveRequest.js'
import { LeaveType } from '../models/LeaveType.js'
import { eachDate, localParts, todayIn, weekdayOf } from '../utils/dateUtils.js'
import { getSettings } from './settingsService.js'

// The ONE place that turns attendance + leave + holidays into per-employee day counts.
// Payroll, dashboards and the AI tools all use it, so their numbers always agree.
//
//  working day = not weekend and not a public holiday
//  absent      = past working day (before today), on/after joining date, no record, no approved leave
export async function workingDates(settings, from, to) {
  const holidays = new Set((await Holiday.find({ date: { $gte: from, $lte: to } }).lean()).map((h) => h.date))
  return eachDate(from, to).filter((d) => !settings.weekend.includes(weekdayOf(d)) && !holidays.has(d))
}

export async function employeeStats(employees, from, to) {
  const settings = await getSettings()
  const today = todayIn(settings.timezone)
  const dates = await workingDates(settings, from, to)
  const ids = employees.map((e) => e._id)

  const [recs, leaves, types] = await Promise.all([
    Attendance.aggregate([
      { $match: { employeeId: { $in: ids }, date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$employeeId',
          dates: { $push: '$date' },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          half_day: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
        },
      },
    ]),
    LeaveRequest.find({ employeeId: { $in: ids }, status: 'approved', startDate: { $lte: to }, endDate: { $gte: from } }).lean(),
    LeaveType.find().lean(),
  ])
  const paid = new Map(types.map((t) => [t.key, t.paid]))
  const recBy = new Map(recs.map((r) => [String(r._id), r]))

  const stats = new Map()
  for (const e of employees) {
    const id = String(e._id)
    const join = e.joiningDate ? localParts(new Date(e.joiningDate), settings.timezone).date : '0000-00-00'
    const eligible = dates.filter((d) => d >= join)
    const r = recBy.get(id)
    const recDates = new Set(r?.dates || [])
    const mine = leaves.filter((l) => String(l.employeeId) === id)
    let absent = 0, leaveDays = 0, unpaidLeaveDays = 0, expected = 0
    for (const d of eligible) {
      const l = mine.find((x) => x.startDate <= d && x.endDate >= d)
      if (l) {
        leaveDays += 1
        if (paid.get(l.leaveTypeKey) === false) unpaidLeaveDays += 1
      }
      if (d < today) {
        expected += 1
        if (!recDates.has(d) && !l) absent += 1
      }
    }
    stats.set(id, {
      present: r?.present || 0, late: r?.late || 0, half_day: r?.half_day || 0,
      absent, leaveDays, unpaidLeaveDays, expectedDays: expected,
      eligibleDays: eligible.length, workingDays: dates.length,
    })
  }
  return { settings, today, dates, stats, leaves, types }
}

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null)

// Totals and the metric formulas from the brief (section 7)
export function totalsOf(stats, ids) {
  const t = { present: 0, late: 0, half_day: 0, absent: 0, leaveDays: 0, expectedDays: 0 }
  for (const id of ids) {
    const s = stats.get(String(id))
    if (!s) continue
    for (const k of Object.keys(t)) t[k] += s[k]
  }
  return {
    ...t,
    attendanceRate: pct(t.present + t.late + 0.5 * t.half_day, t.present + t.late + t.half_day + t.absent),
    latePercent: pct(t.late, t.present + t.late),
    absenteeismRate: pct(t.absent, t.expectedDays),
  }
}
