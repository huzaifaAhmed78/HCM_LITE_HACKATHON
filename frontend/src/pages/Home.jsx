import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import AnnouncementsCard from '../components/Announcements.jsx'
import { Btn, Card, Err, fmtHours, fmtTime, inputCls, useLoad } from '../components/bits.jsx'
import { BarRows, Kpi, Kpis, TrendChart } from '../components/charts.jsx'
import { money } from '../components/ui.jsx'

const today = () => new Date().toISOString().slice(0, 10)
const monthStart = () => `${today().slice(0, 7)}-01`

function Filters({ value, onChange, departments }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 text-sm">
      <label>From <input type="date" className={inputCls} value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} /></label>
      <label>To <input type="date" className={inputCls} value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} /></label>
      <label>Department
        <select className={inputCls} value={value.departmentId} onChange={(e) => onChange({ ...value, departmentId: e.target.value })}>
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
      {!state.bullets && !state.error && <p className="text-sm text-gray-400">Click Summarize for insights on the numbers above.</p>}
      {state.bullets && (
        <>
          <ul className="list-disc space-y-1 pl-5 text-sm">{state.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
          <p className="mt-2 text-[11px] text-gray-400">AI-generated from the dashboard numbers for the current filters.</p>
        </>
      )}
    </Card>
  )
}

function HrDashboard({ role }) {
  const [filters, setFilters] = useState({ from: monthStart(), to: today(), departmentId: '' })
  const depts = useLoad(() => api('/departments'), [])
  const { data, error, loading } = useLoad(() => api(`/dashboard/hr?${qs(filters)}`), [filters.from, filters.to, filters.departmentId])
  const k = data?.kpis, a = data?.attendance
  return (
    <div>
      <Filters value={filters} onChange={setFilters} departments={depts.data} />
      <Err error={error} />
      {loading && !data && <p className="text-sm text-gray-400">Loading dashboard...</p>}
      {data && (
        <>
          <Kpis>
            <Kpi label="Active headcount" value={k.headcount} />
            <Kpi label="Checked in today" value={k.presentToday} />
            <Kpi label="On leave today" value={k.onLeaveToday} />
            <Kpi label="Late today" value={k.lateToday} tone={k.lateToday ? 'text-amber' : ''} />
            <Kpi label="Pending approvals" value={k.pendingApprovals} hint={`${k.pendingLeaves} leave, ${k.pendingCorrections} corrections`} />
          </Kpis>
          <Kpis>
            <Kpi label="Attendance rate" value={a.attendanceRatePercent == null ? '-' : `${a.attendanceRatePercent}%`} hint="in selected range" />
            <Kpi label="Late %" value={a.latePercent == null ? '-' : `${a.latePercent}%`} hint="late / (present + late)" />
            <Kpi label="Absenteeism" value={a.absenteeismPercent == null ? '-' : `${a.absenteeismPercent}%`} hint="absent / expected days" />
            <Kpi label="Absent days" value={a.absentDays} />
            <Kpi label="Late days" value={a.lateDays} />
          </Kpis>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Attendance trend"><TrendChart data={data.trend} /></Card>
            <Card title="Absenteeism by department">
              <BarRows rows={data.absenteeismByDept.map((d) => ({ label: d.department, value: d.absenteeismPercent, note: `${d.absentDays}/${d.expectedDays} days` }))} format={(v) => `${v}%`} />
            </Card>
            <Card title="Approved leave by type (days)"><BarRows rows={data.leaveByType.map((l) => ({ label: l.name, value: l.days }))} /></Card>
            <Card title="Top 5 late-comers">
              <BarRows rows={data.topLateComers.map((l) => ({ label: `${l.name} (${l.employeeCode})`, value: l.lates, note: l.department }))} empty="Nobody was late in this range" />
            </Card>
          </div>
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
      {loading && !data && <p className="text-sm text-gray-400">Loading dashboard...</p>}
      {data && (
        <>
          <Kpis>
            <Kpi label="Active headcount" value={k.headcount} />
            <Kpi label="Attrition" value={`${k.attritionPercent}%`} hint={`${k.exits} exit(s) in range`} />
            <Kpi label="Payroll cost (gross)" value={money(k.payrollCostGross)} hint={`${k.payrollMonths} finalized month(s)`} />
            <Kpi label="Payroll cost (net)" value={money(k.payrollCostNet)} />
            <Kpi label="Average salary (gross)" value={money(k.averageSalary)} />
          </Kpis>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Headcount by department"><BarRows rows={data.headcountByDept.map((d) => ({ label: d.department, value: d.count }))} /></Card>
            <Card title="Payroll cost by department (gross)">
              <BarRows rows={data.payrollCostByDept.map((d) => ({ label: d.department, value: d.gross }))} format={money} empty="No finalized payroll in this range" />
            </Card>
            <Card title="Payroll by month (gross)">
              <BarRows rows={data.payrollByMonth.map((m) => ({ label: m.month, value: m.gross }))} format={money} empty="No finalized payroll in this range" />
            </Card>
            <Card title="Tenure"><BarRows rows={data.tenure.map((t) => ({ label: t.bucket, value: t.count }))} /></Card>
            <Card title="Average gross by department"><BarRows rows={data.averageSalaryByDept.map((d) => ({ label: d.department, value: d.averageGross, note: `${d.count} people` }))} format={money} /></Card>
            <Card title="Average gross by designation"><BarRows rows={data.averageSalaryByDesignation.map((d) => ({ label: d.designation, value: d.averageGross, note: `${d.count} people` }))} format={money} /></Card>
          </div>
          <Card title="Latest activity" right={<Link to="/audit" className="text-sm underline">Open audit log</Link>}>
            <ul className="divide-y divide-sand text-sm">
              {data.auditFeed.length === 0 && <li className="py-2 text-gray-400">No activity yet</li>}
              {data.auditFeed.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 py-1.5"><span><span className="font-medium">{a.action}</span> <span className="text-gray-400">{a.entity}</span></span><span className="text-xs text-gray-400">{a.actorRole} &middot; {new Date(a.at).toLocaleString()}</span></li>
              ))}
            </ul>
          </Card>
          <AiSummary scope="admin" filters={filters} />
        </>
      )}
      <p className="mt-2 text-xs text-gray-400">Gender is not captured in the employee record, so it is not shown. Attrition is estimated from employees marked inactive in the range.</p>
    </div>
  )
}

function EmployeeDashboard() {
  const { data, error, loading } = useLoad(() => api('/dashboard/me'), [])
  const pct = data ? Math.min(100, Math.round((data.hoursThisWeek.minutes / data.hoursThisWeek.targetMinutes) * 100)) : 0
  return (
    <div>
      <Err error={error} />
      {loading && !data && <p className="text-sm text-gray-400">Loading dashboard...</p>}
      {data && (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Today" right={<Link to="/attendance" className="text-sm underline">Check in / out</Link>}>
              {data.today ? (
                <p className="text-sm">Checked in at <b>{fmtTime(data.today.checkIn)}</b> ({data.today.status.replace('_', ' ')}){data.today.checkOut ? <>, checked out at <b>{fmtTime(data.today.checkOut)}</b></> : ', not checked out yet'}.</p>
              ) : <p className="text-sm text-gray-500">You have not checked in today.</p>}
            </Card>
            <Card title="Hours this week">
              <div className="font-display text-2xl font-bold">{fmtHours(data.hoursThisWeek.minutes) === '-' ? '0h 0m' : fmtHours(data.hoursThisWeek.minutes)} <span className="text-sm font-normal text-gray-500">of 40h</span></div>
              <div className="mt-2 h-2 rounded bg-sand/60"><div className="h-2 rounded bg-pine" style={{ width: `${pct}%` }} /></div>
            </Card>
          </div>
          <Kpis>
            <Kpi label="Late count (this month)" value={data.lateCountThisMonth} />
            {data.leaveBalance.map((b) => <Kpi key={b.key} label={`${b.name} left`} value={b.remaining == null ? 'Unlimited' : b.remaining} hint={b.quota == null ? 'unpaid' : `of ${b.quota}`} />)}
            <Kpi label="Last payslip" value={data.lastPayslip ? money(data.lastPayslip.net) : 'None yet'} hint={data.lastPayslip?.month} />
          </Kpis>
          <Card title="Ask my assistant" right={<Btn onClick={() => window.dispatchEvent(new Event('ai:open'))}>Open assistant</Btn>}>
            <p className="text-sm text-gray-600">Ask about your leave balance, attendance or company policy. Need time off? <Link to="/leave" className="underline">Describe it in plain words</Link> and the form fills itself.</p>
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
