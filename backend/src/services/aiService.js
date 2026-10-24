import { z } from 'zod'
import { env } from '../config/env.js'
import { AiLog } from '../models/AiLog.js'
import { Department } from '../models/Department.js'
import { Employee } from '../models/Employee.js'
import { LeaveRequest } from '../models/LeaveRequest.js'
import { LeaveType } from '../models/LeaveType.js'
import { ApiError } from '../utils/ApiError.js'
import { localParts, monthRange, todayIn } from '../utils/dateUtils.js'
import * as analytics from './analyticsService.js'
import * as leaves from './leaveService.js'
import * as payroll from './payrollService.js'
import { getSettings } from './settingsService.js'
import { cleanArgs, nullableOptional, parseJson } from '../ai/toolArgs.js'

const TIMEOUT_MS = 15000
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const isHr = (actor) => actor.role === 'hr' || actor.role === 'admin'

// ---------- guardrails: key on server, hourly limit, 15 s timeout, logging ----------
async function guard(actor) {
  if (!env.aiApiKey) throw new ApiError(503, 'The AI assistant is not configured yet (AI_API_KEY is missing).')
  const since = new Date(Date.now() - 3600 * 1000)
  const used = await AiLog.countDocuments({ userId: actor.id, at: { $gte: since } })
  if (used >= env.aiRateLimit) throw new ApiError(429, `AI limit reached (${env.aiRateLimit} requests per hour). Please try again later.`)
}

const RETRY_HINT = 'Omit optional tool arguments you do not need instead of sending null. If JSON is requested, reply with the JSON object only.'

async function llm(body, signal, retried = false) {
  let res
  try {
    res = await fetch(`${env.aiBaseUrl}/chat/completions`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.aiApiKey}` },
      body: JSON.stringify({ model: env.aiModel, temperature: 0.2, ...body }),
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') throw new ApiError(503, 'The assistant took too long to answer. Please try again, or use the dashboard.')
    throw new ApiError(503, 'The assistant is unavailable right now. Please try again, or use the normal screens.')
  }
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 300)
    console.error('AI provider error', res.status, text)
    // Retry ONCE when the model made an invalid tool call or the provider rejected response_format.
    if (res.status === 400 && !retried && /tool_use_failed|response_format|json/i.test(text)) {
      const { response_format, ...rest } = body
      return llm({ ...rest, messages: [...rest.messages, { role: 'system', content: RETRY_HINT }] }, signal, true)
    }
    if (res.status === 429) throw new ApiError(503, 'The assistant is busy right now. Please try again in a minute.')
    throw new ApiError(503, 'The assistant is unavailable right now. Please try again, or use the normal screens.')
  }
  return res.json()
}

// Runs fn with a log entry; the log is written whether it succeeds or fails.
async function logged(actor, kind, prompt, fn) {
  const started = Date.now()
  const tools = []
  try {
    const out = await fn(tools)
    await AiLog.create({ userId: actor.id, role: actor.role, kind, prompt: prompt.slice(0, 2000), tools, response: String(out.text ?? JSON.stringify(out)).slice(0, 4000), ms: Date.now() - started })
    return out
  } catch (err) {
    await AiLog.create({ userId: actor.id, role: actor.role, kind, prompt: prompt.slice(0, 2000), tools, ok: false, error: String(err.message).slice(0, 500), ms: Date.now() - started }).catch(() => {})
    throw err
  }
}

// ---------- system prompt: the rules from the brief live here (policy Q&A) ----------
async function systemPrompt(actor) {
  const s = await getSettings()
  const types = await LeaveType.find().sort({ name: 1 }).lean()
  const today = todayIn(s.timezone)
  const weekend = s.weekend.map((d) => DAYS[d]).join(' and ')
  const quotas = types.map((t) => `${t.name}: ${t.yearlyQuota == null ? 'unlimited' : `${t.yearlyQuota} days per year`}${t.paid ? '' : ' (unpaid)'}`).join('; ')
  return `You are the HCM Lite assistant for ${s.companyName}. The user is ${actor.name} (role: ${actor.role}).
Today is ${DAYS[localParts(new Date(), s.timezone).weekday]} ${today} (${s.timezone}).

DATA RULES
- The database is the only source of truth. For any number, name, balance or list, CALL A TOOL. Never guess or invent figures.
- Only report what the tool returned. If a tool returns an error or "not allowed", explain politely and do not try to work around it.
- Employees may only see their own data and company policy. Politely refuse questions about other people's salary, attendance or leave.
- Reply in the language the user writes in (English, Urdu, or Roman Urdu). Keep answers short and clear.
- Dates in tools are YYYY-MM-DD. Convert words like "this month" or "last week" using today's date.

COMPANY POLICY (answer policy questions ONLY from this; if it is not here, say you do not know)
- Office starts at ${s.officeStart}. Grace time is ${s.graceMinutes} minutes, so a check-in after that is Late. Working less than ${s.halfDayHours} hours is a Half day.
- Weekend: ${weekend}. Weekends and public holidays are not working days.
- One attendance record per employee per day; a second check-in is rejected. Absent means a past working day with no record and no approved leave.
- Missed check-ins can be fixed with an attendance correction request that HR approves.
- Leave quotas: ${quotas}. Only working days count. Overlapping leave or leave above the balance is rejected. HR approves or rejects with a comment.
- Payroll: gross = 1.5 x basic (HRA 40%, medical 10%). Per day = gross / working days of the month. Deductions = absent days + unpaid leave days + 0.5 x half days, each at the per day rate. Joiners are prorated. Tax uses the annual slab on gross x 12: up to 600,000 nil; 5% up to 1.2M; 30,000 + 15% up to 2.4M; 210,000 + 25% up to 3.6M; 510,000 + 35% above. Admin finalizes payroll and a finalized month is locked.`
}

// ---------- tools (reuse the same services as the dashboards, always scoped to the caller) ----------
const range = (a, settings) => {
  const today = todayIn(settings.timezone)
  return { from: a.from || `${today.slice(0, 7)}-01`, to: a.to || today }
}

async function findDepartment(name) {
  if (!name) return { id: null }
  const esc = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const d = await Department.findOne({ name: new RegExp(`^${esc}$`, 'i') }).lean()
  if (d) return { id: String(d._id), name: d.name }
  return { error: `Unknown department "${name}"`, departments: (await Department.find().lean()).map((x) => x.name) }
}

const scopeEmployees = async (actor, department) => {
  if (!isHr(actor)) return { employees: await analytics.activeEmployees({ employeeId: actor.employeeId }) }
  const d = await findDepartment(department)
  if (d.error) return { error: d.error, departments: d.departments }
  return { employees: await analytics.activeEmployees({ departmentId: d.id }), department: d.name }
}

const NOT_ALLOWED = { error: 'not allowed: this information is only available to HR and Admin' }

const TOOLS = {
  get_headcount: {
    roles: ['hr', 'admin'],
    description: 'Number of active employees, total and per department. Optionally for one department.',
    parameters: { type: 'object', properties: { department: { type: 'string', description: 'Department name' } } },
    async run(actor, a) {
      const { employees, error, departments, department } = await scopeEmployees(actor, a.department)
      if (error) return { error, departments }
      const dn = new Map((await Department.find().lean()).map((d) => [String(d._id), d.name]))
      const by = {}
      for (const e of employees) { const n = dn.get(String(e.departmentId)) || 'Unassigned'; by[n] = (by[n] || 0) + 1 }
      return { activeEmployees: employees.length, department: department || 'All departments', byDepartment: by }
    },
  },
  get_attendance_summary: {
    roles: ['employee', 'hr', 'admin'],
    description: 'Attendance totals and rates for a date range (default: this month). Employees get their own numbers only.',
    parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, department: { type: 'string' } } },
    async run(actor, a) {
      const s = await getSettings()
      const r = range(a, s)
      const { employees, error, departments } = await scopeEmployees(actor, a.department)
      if (error) return { error, departments }
      const { totals } = await analytics.attendanceSummary(employees, r.from, r.to)
      return { from: r.from, to: r.to, employees: employees.length, presentDays: totals.present, lateDays: totals.late, halfDays: totals.half_day, absentDays: totals.absent, leaveDays: totals.leaveDays, attendanceRatePercent: totals.attendanceRate, latePercent: totals.latePercent, absenteeismPercent: totals.absenteeismRate }
    },
  },
  get_late_comers: {
    roles: ['hr', 'admin'],
    description: 'Employees ranked by number of late arrivals in a date range (default this month).',
    parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, department: { type: 'string' }, limit: { type: 'integer' } } },
    async run(actor, a) {
      const s = await getSettings()
      const r = range(a, s)
      const { employees, error, departments } = await scopeEmployees(actor, a.department)
      if (error) return { error, departments }
      const { stats } = await analytics.attendanceSummary(employees, r.from, r.to)
      return { from: r.from, to: r.to, lateComers: await analytics.topLateComers(employees, stats, Math.min(Number(a.limit) || 5, 20)) }
    },
  },
  get_leave_summary: {
    roles: ['hr', 'admin'],
    description: 'Who is on approved leave on a date or in a range (default today), plus pending request count.',
    parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, department: { type: 'string' } } },
    async run(actor, a) {
      const s = await getSettings()
      const today = todayIn(s.timezone)
      const from = a.from || today, to = a.to || a.from || today
      const { employees, error, departments } = await scopeEmployees(actor, a.department)
      if (error) return { error, departments }
      const ids = employees.map((e) => e._id)
      const [rows, pending] = await Promise.all([
        LeaveRequest.find({ employeeId: { $in: ids }, status: 'approved', startDate: { $lte: to }, endDate: { $gte: from } }).populate('employeeId', 'name employeeCode').lean(),
        LeaveRequest.countDocuments({ employeeId: { $in: ids }, status: 'pending' }),
      ])
      return { from, to, onLeave: rows.map((l) => ({ name: l.employeeId?.name, employeeCode: l.employeeId?.employeeCode, type: l.leaveTypeKey, startDate: l.startDate, endDate: l.endDate, days: l.days })), pendingRequests: pending }
    },
  },
  get_my_leave_balance: {
    roles: ['employee'],
    description: "The signed-in employee's own leave balance for a year (default this year): quota, used, pending, remaining per leave type.",
    parameters: { type: 'object', properties: { year: { type: 'string' } } },
    async run(actor, a) {
      if (!actor.employeeId) return { error: 'You do not have an employee profile, so there is no leave balance.' }
      return { year: a.year || String(new Date().getUTCFullYear()), balances: await leaves.balances(actor.employeeId, a.year) }
    },
  },
  get_payroll_summary: {
    roles: ['employee', 'hr', 'admin'],
    description: 'Payroll totals for a month (YYYY-MM, default current month). Employees only get their own finalized payslip.',
    parameters: { type: 'object', properties: { month: { type: 'string' } } },
    async run(actor, a) {
      const s = await getSettings()
      const month = a.month || todayIn(s.timezone).slice(0, 7)
      if (!isHr(actor)) {
        const mine = (await payroll.myPayslips(actor)).find((p) => p.month === month)
        return mine ? { month, gross: mine.earnedGross, deduction: mine.deduction, tax: mine.tax, net: mine.net } : { month, message: 'No finalized payslip for you in this month.' }
      }
      return (await payroll.payrollSummary(month)) || { month, message: 'No payroll run exists for this month yet.' }
    },
  },
  search_employees: {
    roles: ['hr', 'admin'],
    description: 'Find employees by name, email or code. Returns department, designation and status.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    async run(actor, a) {
      const esc = String(a.query || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (!esc) return { error: 'query is required' }
      const re = new RegExp(esc, 'i')
      const rows = await Employee.find({ $or: [{ name: re }, { email: re }, { employeeCode: re }] }).limit(10).populate('departmentId', 'name').populate('designationId', 'name').lean()
      return { results: rows.map((e) => ({ name: e.name, employeeCode: e.employeeCode, email: e.email, department: e.departmentId?.name, designation: e.designationId?.name, status: e.status })) }
    },
  },
}

const toolsFor = (role) =>
  Object.entries(TOOLS).filter(([, t]) => t.roles.includes(role)).map(([name, t]) => ({ type: 'function', function: { name, description: t.description, parameters: nullableOptional(t.parameters) } }))

async function runTool(actor, name, rawArgs) {
  const tool = TOOLS[name]
  if (!tool || !tool.roles.includes(actor.role)) return NOT_ALLOWED // same role check as the REST API
  let args
  try { args = cleanArgs(rawArgs ? JSON.parse(rawArgs) : {}) } catch { return { error: 'invalid arguments' } }
  try { return await tool.run(actor, args) } catch (err) { return { error: err.message || 'tool failed' } }
}

// ---------- 1. chat ----------
export async function chat(actor, message, history = []) {
  await guard(actor)
  return logged(actor, 'chat', message, async (used) => {
    const signal = AbortSignal.timeout(TIMEOUT_MS)
    const messages = [{ role: 'system', content: await systemPrompt(actor) }, ...history.slice(-6), { role: 'user', content: message }]
    const tools = toolsFor(actor.role)
    for (let round = 0; round < 3; round += 1) {
      const data = await llm({ messages, tools, tool_choice: 'auto' }, signal)
      const msg = data.choices?.[0]?.message
      if (!msg) throw new ApiError(503, 'The assistant did not answer. Please try again.')
      if (!msg.tool_calls?.length) return { text: msg.content?.trim() || 'Sorry, I could not find an answer.', tools: used }
      messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls })
      for (const call of msg.tool_calls) {
        used.push(call.function.name)
        const result = await runTool(actor, call.function.name, call.function.arguments)
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
      }
    }
    const last = await llm({ messages }, signal) // out of rounds: answer with what we have
    return { text: last.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not find an answer.', tools: used }
  }).then((r) => ({ answer: r.text, tools: r.tools }))
}

// ---------- 2. dashboard summary ----------
const summarySchema = z.object({ bullets: z.array(z.string().trim().min(5).max(300)).min(1).max(6) })

export async function summarize(actor, { scope, ...filters }) {
  await guard(actor)
  if (scope === 'admin' && actor.role !== 'admin') throw new ApiError(403, 'You do not have access to this resource')
  return logged(actor, 'summary', `${scope} ${JSON.stringify(filters)}`, async () => {
    const kpis = scope === 'admin' ? await analytics.adminDashboard(filters) : await analytics.hrDashboard(filters)
    const { auditFeed, ...data } = kpis
    const signal = AbortSignal.timeout(TIMEOUT_MS)
    const messages = [
      { role: 'system', content: 'You write short insights for an HR dashboard. Use ONLY the numbers in the JSON. Never invent or estimate figures. If a value is null or zero, say there is not enough data. Reply as JSON: {"bullets": ["...", "..."]} with 3 to 5 bullets, each under 30 words.' },
      { role: 'user', content: JSON.stringify(data) },
    ]
    for (let attempt = 0; attempt < 2; attempt += 1) { // validate, retry once
      const res = await llm({ messages, response_format: { type: 'json_object' } }, signal)
      try {
        const parsed = summarySchema.parse(parseJson(res.choices[0].message.content))
        return { bullets: parsed.bullets, text: parsed.bullets.join('\n') }
      } catch { /* retry */ }
    }
    throw new ApiError(503, 'Could not produce a summary right now. The numbers above are still correct.')
  }).then((r) => ({ bullets: r.bullets }))
}

// ---------- 3. smart leave (never saves anything) ----------
export async function smartLeave(actor, text) {
  await guard(actor)
  return logged(actor, 'smart_leave', text, async () => {
    const s = await getSettings()
    const types = await LeaveType.find().lean()
    const today = todayIn(s.timezone)
    const wd = DAYS[localParts(new Date(), s.timezone).weekday]
    const keys = types.map((t) => t.key)
    const schema = z.object({
      leaveTypeKey: z.string().transform((v) => v.toLowerCase()).refine((v) => keys.includes(v), 'Unknown leave type'),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().trim().max(300).default(''),
    }).refine((v) => v.endDate >= v.startDate, 'End before start')
    const signal = AbortSignal.timeout(TIMEOUT_MS)
    const messages = [
      { role: 'system', content: `Turn the employee's request (English, Urdu or Roman Urdu) into leave form fields. Today is ${wd} ${today}. "Next Monday" means the first Monday strictly after today. Leave types (use the key): ${types.map((t) => `${t.key} = ${t.name}`).join('; ')}. Pick: wedding, family event or personal errand -> casual; illness or doctor -> sick; holiday or vacation -> annual; unpaid or no pay -> unpaid. Reply ONLY as JSON: {"leaveTypeKey": "...", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "short reason"}. A single day has the same start and end date.` },
      { role: 'user', content: text },
    ]
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await llm({ messages, response_format: { type: 'json_object' } }, signal)
      try {
        const form = schema.parse(parseJson(res.choices[0].message.content))
        return { form, text: JSON.stringify(form) }
      } catch { /* retry once */ }
    }
    throw new ApiError(422, 'Could not understand that request. Please fill in the leave form by hand.')
  }).then((r) => r.form)
}
