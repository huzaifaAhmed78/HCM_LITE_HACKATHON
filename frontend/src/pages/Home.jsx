import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import AnnouncementsCard from '../components/Announcements.jsx'
import { Badge, Btn, Card, Err, fmtHours, fmtTime, inputCls, useLoad } from '../components/bits.jsx'
import { BarRows, Heatmap, Kpi, Kpis, TrendChart } from '../components/charts.jsx'
import { money } from '../components/ui.jsx'

const today = () => new Date().toISOString().slice(0, 10)
const monthStart = () => `${today().slice(0, 7)}-01`

function Filters({ value, onChange, departments }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-sand bg-white p-3 text-sm shadow-card">
      <label className="text-xs text-ink/60">From <input type="date" className={`${inputCls} mt-1 text-ink`} value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} /></label>
      <label className="text-xs text-ink/60">To <input type="date" className={`${inputCls} mt-1 text-ink`} value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} /></label>
      <label className="text-xs text-ink/60">Department
        <select className={`${inputCls} mt-1 text-ink`} value={value.departmentId} onChange={(e) => onChange({ ...value, departmentId: e.target.value })}>
          <option value="">All departments</option>
          {(departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
    </div>
  )
}

const qs = (f) => new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()

function AiSummary({ scope, filters }) {
  const [state, setState] = useState({ busy: false, bullets: null, error: null })
  const run = async () => {
    setState({ busy: true, bullets: null, error: null })
    try {
      const body = { scope, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
      const r = await api('/ai/summary', { method: 'POST', body })
      setState({ busy: false, bullets: r.bullets, error: null })
    } catch (e) { setState({ busy: false, bullets: null, error: e }) }
  }
  return (
    <Card title="AI summary" right={<Btn onClick={run} disabled={state.busy}>{state.busy ? 'Summarizing...' : 'Summarize'}</Btn>}>
      <Err error={state.error} />
      {!state.bullets && !state.error && <p className="text-sm text-ink/50">Click Summarize for insights on the numbers above.</p>}
      {state.bullets && (
        <>
          <ul className="list-disc space-y-1 pl-5 text-sm">{state.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
          <p className="mt-2 text-[11px] text-ink/50">AI-generated from the dashboard numbers for the current filters.</p>
        </>
      )}
    </Card>
  )
}

// Who is in today: the first rows of the daily attendance board, with a link to the full board.
function TodayBoard({ limit = 8 }) {
  const { data, error } = useLoad(() => api('/attendance/board'), [])
  const rows = (data?.rows || []).slice(0, limit)
  return (
    <Card title={`Today's attendance${data ? ` - ${data.date}` : ''}`} right={<Link to="/attendance-board" className="text-sm font-medium text-pine hover:underline">View all</Link>}>
      <Err error={error} />
      {!data && !error && <p className="text-sm text-ink/50">Loading...</p>}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr><th>Employee</th><th>Department</th><th>Check-in</th><th>Check-out</th><th>Worked</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <td className="whitespace-nowrap">
                    <Link className="font-medium hover:underline" to={`/employees/${r.employeeId}`}>{r.name}</Link>
                    <span className="ml-1.5 text-xs text-ink/50">{r.employeeCode}</span>
                  </td>
                  <td>{r.department || '-'}</td>
                  <td>{fmtTime(r.checkIn)}</td>
                  <td>{fmtTime(r.checkOut)}</td>
                  <td>{fmtHours(r.workedMinutes)}</td>
                  <td><Badge status={r.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="6" className="text-ink/50">No active employees yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function HrDashboard() {
  const [filters, setFilters] = useState({ from: monthStart(), to: today(), departmentId: '' })
  const depts = useLoad(() => api('/departments'), [])
  const { data, error, loading } = useLoad(() => api(`/dashboard/hr?${qs(filters)}`), [filters.from, filters.to, filters.departmentId])
  const k = data?.kpis, a = data?.attendance
  return (
    <div>
      <Filters value={filters} onChange={setFilters} departments={depts.data} />
      <Err error={error} />
      {loading && !data && <p className="text-sm text-ink/50">Loading dashboard...</p>}
      {data && (
        <>
          <Kpis>
            <Kpi label="Active headcount" value={k.headcount} />
            <Kpi label="Checked in today" value={k.presentToday} />
            <Kpi label="On leave today" value={k.onLeaveToday} />
            <Kpi label="Late today" value={k.lateToday} tone={k.lateToday ? 'text-amber' : ''} />
            <Kpi label="Pending approvals" value={k.pendingApprovals} hint={`${k.pendingLeaves} leave, ${k.pendingCorrections} corrections`} />
          </Kpis>

          <div className="mb-5 grid gap-5 lg:grid-cols-3">
            <Card title="Attendance overview" className="mb-0 lg:order-2">
              <div className="font-display text-3xl font-bold tabular-nums">{a.attendanceRatePercent == null ? '-' : `${a.attendanceRatePercent}%`}</div>
              <p className="mb-4 mt-1 text-xs text-ink/60">of expected people were in during the selected range</p>
              <Heatmap data={data.trend} />
            </Card>
            <div className="grid gap-5 sm:grid-cols-2 lg:order-1 lg:col-span-2">
              <Kpi label="Late %" value={a.latePercent == null ? '-' : `${a.latePercent}%`} hint="late / (present + late)" />
              <Kpi label="Absenteeism" value={a.absenteeismPercent == null ? '-' : `${a.absenteeismPercent}%`} hint="absent / expected days" />
              <Kpi label="Absent days" value={a.absentDays} />
              <Kpi label="Late days" value={a.lateDays} />
            </div>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Card title="Attendance trend" className="mb-0"><TrendChart data={data.trend} /></Card>
            <Card title="Absenteeism by department" className="mb-0">
              <BarRows rows={data.absenteeismByDept.map((d) => ({ label: d.department, value: d.absenteeismPercent, note: `${d.absentDays}/${d.expectedDays} days` }))} format={(v) => `${v}%`} />
            </Card>
            <Card title="Approved leave by type (days)" className="mb-0"><BarRows rows={data.leaveByType.map((l) => ({ label: l.name, value: l.days }))} /></Card>
            <Card title="Top 5 late-comers" className="mb-0">
              <BarRows rows={data.topLateComers.map((l) => ({ label: `${l.name} (${l.employeeCode})`, value: l.lates, note: l.department }))} empty="Nobody was late in this range" />
            </Card>
          </div>

          <TodayBoard />
          <AiSummary scope="hr" filters={filters} />
        </>
      )}
    </div>
  )
}

function AdminDashboard() {
  const year = today().slice(0, 4)
  const [filters, setFilters] = useState({ from: `${year}-01-01`, to: today(), departmentId: '' })
  const depts = useLoad(() => api('/departments'), [])
  const { data, error, loading } = useLoad(() => api(`/dashboard/admin?${qs(filters)}`), [filters.from, filters.to, filters.departmentId])
  const k = data?.kpis
  return (
    <div>
      <Filters value={filters} onChange={setFilters} departments={depts.data} />
      <Err error={error} />
      {loading && !data && <p className="text-sm text-ink/50">Loading dashboard...</p>}
      {data && (
        <>
          <Kpis>
            <Kpi label="Active headcount" value={k.headcount} />
            <Kpi label="Attrition" value={`${k.attritionPercent}%`} hint={`${k.exits} exit(s) in range`} />
            <Kpi label="Payroll cost (gross)" value={money(k.payrollCostGross)} hint={`${k.payrollMonths} finalized month(s)`} />
            <Kpi label="Payroll cost (net)" value={money(k.payrollCostNet)} />
            <Kpi label="Average salary (gross)" value={money(k.averageSalary)} />
          </Kpis>
          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Card title="Headcount by department" className="mb-0"><BarRows rows={data.headcountByDept.map((d) => ({ label: d.department, value: d.count }))} /></Card>
            <Card title="Payroll cost by department (gross)" className="mb-0">
              <BarRows rows={data.payrollCostByDept.map((d) => ({ label: d.department, value: d.gross }))} format={money} empty="No finalized payroll in this range" />
            </Card>
            <Card title="Payroll by month (gross)" className="mb-0">
              <BarRows rows={data.payrollByMonth.map((m) => ({ label: m.month, value: m.gross }))} format={money} empty="No finalized payroll in this range" />
            </Card>
            <Card title="Tenure" className="mb-0"><BarRows rows={data.tenure.map((t) => ({ label: t.bucket, value: t.count }))} /></Card>
            <Card title="Average gross by department" className="mb-0"><BarRows rows={data.averageSalaryByDept.map((d) => ({ label: d.department, value: d.averageGross, note: `${d.count} people` }))} format={money} /></Card>
            <Card title="Average gross by designation" className="mb-0"><BarRows rows={data.averageSalaryByDesignation.map((d) => ({ label: d.designation, value: d.averageGross, note: `${d.count} people` }))} format={money} /></Card>
          </div>
          <TodayBoard />
          <Card title="Latest activity" right={<Link to="/audit" className="text-sm font-medium text-pine hover:underline">Open audit log</Link>}>
            <ul className="divide-y divide-sand text-sm">
              {data.auditFeed.length === 0 && <li className="py-2 text-ink/50">No activity yet</li>}
              {data.auditFeed.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 py-2"><span><span className="font-medium">{a.action}</span> <span className="text-ink/50">{a.entity}</span></span><span className="text-xs text-ink/50">{a.actorRole} &middot; {new Date(a.at).toLocaleString()}</span></li>
              ))}
            </ul>
          </Card>
          <AiSummary scope="admin" filters={filters} />
        </>
      )}
      <p className="mt-2 text-xs text-ink/50">Gender is not captured in the employee record, so it is not shown. Attrition is estimated from employees marked inactive in the range.</p>
    </div>
  )
}

function EmployeeDashboard() {
  const { data, error, loading } = useLoad(() => api('/dashboard/me'), [])
  const pct = data ? Math.min(100, Math.round((data.hoursThisWeek.minutes / data.hoursThisWeek.targetMinutes) * 100)) : 0
  return (
    <div>
      <Err error={error} />
      {loading && !data && <p className="text-sm text-ink/50">Loading dashboard...</p>}
      {data && (
        <>
          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Card title="Today" className="mb-0" right={<Link to="/attendance" className="text-sm font-medium text-pine hover:underline">Check in / out</Link>}>
              {data.today ? (
                <p className="text-sm">Checked in at <b>{fmtTime(data.today.checkIn)}</b> ({data.today.status.replace('_', ' ')}){data.today.checkOut ? <>, checked out at <b>{fmtTime(data.today.checkOut)}</b></> : ', not checked out yet'}.</p>
              ) : <p className="text-sm text-ink/60">You have not checked in today.</p>}
            </Card>
            <Card title="Hours this week" className="mb-0">
              <div className="font-display text-3xl font-bold tabular-nums">{fmtHours(data.hoursThisWeek.minutes) === '-' ? '0h 0m' : fmtHours(data.hoursThisWeek.minutes)} <span className="text-sm font-normal text-ink/60">of 40h</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper"><div className="h-2 rounded-full bg-gradient-to-r from-pine to-mint" style={{ width: `${pct}%` }} /></div>
            </Card>
          </div>
          <Kpis>
            <Kpi label="Late count (this month)" value={data.lateCountThisMonth} />
            {data.leaveBalance.map((b) => <Kpi key={b.key} label={`${b.name} left`} value={b.remaining == null ? 'Unlimited' : b.remaining} hint={b.quota == null ? 'unpaid' : `of ${b.quota}`} />)}
            <Kpi label="Last payslip" value={data.lastPayslip ? money(data.lastPayslip.net) : 'None yet'} hint={data.lastPayslip?.month} />
          </Kpis>
          <Card title="Ask my assistant" right={<Btn onClick={() => window.dispatchEvent(new Event('ai:open'))}>Open assistant</Btn>}>
            <p className="text-sm text-ink/70">Ask about your leave balance, attendance or company policy. Need time off? <Link to="/leave" className="font-medium text-pine underline">Describe it in plain words</Link> and the form fills itself.</p>
          </Card>
        </>
      )}
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold">Welcome, {user.name.split(' ')[0]}</h1>
      <p className="mb-5 text-sm text-ink/70">{user.role === 'admin' ? 'Company dashboard' : user.role === 'hr' ? 'HR dashboard' : 'Your dashboard'}</p>
      {user.role === 'admin' && <AdminDashboard />}
      {user.role === 'hr' && <HrDashboard />}
      {user.role === 'employee' && <EmployeeDashboard />}
      <div className="mt-5"><AnnouncementsCard /></div>
    </div>
  )
}
