# HCM Lite: Decisions and Architecture

Status: **for team approval before any code is written.**
Brief: Saylani Hackathon, 24 Oct 2026. 4 people (2 backend, 2 frontend). Web app required, mobile and camera are bonus.

---

## 1. What the judges score (100 + 10 bonus)

| Criteria | Pts | What it means for us |
|---|---|---|
| Core HR flows | 25 | Login per role, employees, check-in, leave approval, payroll run, all end to end |
| Data & analytics | 20 | Dashboard numbers must match the records judges create. All numbers from DB aggregation |
| AI features | 15 | Correct tool answers, role scoping, smart leave, summary, graceful failure |
| Code quality | 15 | Module structure, rules inside services, validation, **tests** |
| UI / UX | 10 | Loading, empty and error states, responsive down to 375 px |
| Security & RBAC | 10 | Server-side scope checks, bcrypt, AI key on server, audit log |
| Demo & docs | 5 | 5-minute story, hosted link, README a judge can run in under 10 minutes |

**Strategy:** the 5-minute demo script (brief, section 9) is our build order. If a feature is not in the demo path, it is built last.

---

## 2. Tech stack (decided)

| Layer | Choice | Why | Fallback |
|---|---|---|---|
| Language | **JavaScript (ES modules)** everywhere | One language for the whole team, no type-setup time | TypeScript later if time |
| Backend | **Node.js 20 + Express** | Fast to write, huge docs, the brief's own library list is MERN-friendly | none |
| Pattern | **MVC** (with a services layer) | Familiar to the whole team, clear folders, and rules stay reusable by the REST API, the AI tools and tests | none |
| Database | **MongoDB Atlas (free M0) + Mongoose** | No migrations, flexible documents, aggregation pipelines for dashboards, unique compound indexes for "one attendance per day" | PostgreSQL if the team prefers SQL (only the data layer changes) |
| Auth | **JWT + bcrypt** | Required by the brief | none |
| Validation | **Zod** | One schema validates requests, and also validates the AI's JSON output | express-validator |
| PDF | **pdfkit** | Server-side payslip PDF, no browser needed | none |
| CSV (optional) | **csv-parse** + multer | Dry-run import | skip if short on time |
| Tests | **Node built-in test runner (`node --test`)** | Zero setup, enough to test pure rule functions | Jest |
| Frontend | **React 18 + Vite + React Router** | Fast, familiar | none |
| Styling | **Tailwind CSS** (no Bootstrap) | One styling system for a bigger app, dark theme reuse | none |
| Data fetching | **axios + TanStack Query** | Gives loading / error / empty states almost for free (UI/UX points) | axios + useEffect |
| Charts | **Recharts** | Simple bar, line, pie charts | none |
| LLM | **Any OpenAI-compatible API with tool calling.** First choice: **Groq** (`llama-3.3-70b-versatile`), fallback: Google Gemini or OpenRouter free models | Free tier, no card, fast, tool calling works. Free-tier limits are tight (about 30 requests/min, check Console > Limits), so we add retry and a fallback | Gemini free tier |
| Hosting | **Vercel** (frontend) + **Render free web service** (backend) + **MongoDB Atlas** (DB) | All free. Atlas is external, so free Render DB expiry does not affect us | Koyeb, Railway |
| Face detection (bonus) | `@vladmandic/face-api` or MediaPipe in the browser + `geolib` on server | Listed in the brief | skip |

The AI client reads `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` from env, so switching provider needs **no code change**.
Model names and free limits change often, so confirm them in the provider console on the day.

### Known free-tier risks and fixes

| Risk | Fix |
|---|---|
| Render free service sleeps after 15 min idle, first request takes about 30 s | Free ping from cron-job.org every 10 minutes to `/health`. Open the app 5 minutes before the demo |
| Render free has no persistent disk | We store nothing on disk. Payslip PDFs are generated on request |
| Groq free rate limits | Per-user limit of 20/hour in our code, retry once, friendly fallback message |
| No cron on free hosting | **No scheduled jobs.** Absent, missing_checkout and balances are computed when read |

---

## 3. Key architecture decisions

1. **Backend enforces everything.** Every route has `authenticate`, then `requireRole(...)`, then a data-scope filter. Hiding a button is never the only protection.
2. **One scope helper.** `scopeFor(user)` returns `{}` for Admin and HR, and `{ employeeId: user.employeeId }` for Employee. Every list or read query merges it. The AI tools use the same services, so the AI has the same access as the person asking.
3. **Rules live in services, not controllers.** Controllers only parse the request and call a service. Pure rule functions (`attendanceStatus`, `workingDays`, `calcTax`, `calcPayslip`) have no database calls, so they are easy to unit test.
4. **Derived, not stored (where possible).**
   - `absent` and `on_leave` are computed from "no record + approved leave" for each working day.
   - `missing_checkout` is computed when a past day has check-in but no check-out.
   - Leave balance = quota minus approved days this year.
   - This avoids cron jobs and data drift, and dashboards always match the records.
5. **Dates and time.** Attendance `date` is a plain `YYYY-MM-DD` string in the company timezone (stored in settings). Timestamps are stored in UTC. The **server** stamps check-in time, never the client.
6. **Settings apply to new records only.** Status is computed and saved at check-in or check-out using the settings at that moment. Old records are not recalculated.
7. **Audit log is append-only.** Only `auditService.log()` writes to it. There is no update or delete route for it. Every create, update, approve and finalize calls it with `before` and `after` JSON.
8. **Finalized payroll is immutable.** Any write to a finalized run returns 409.
9. **One JWT, 8 hours.** Claims: `sub`, `role`, `employeeId`, `mustChangePassword`. If `mustChangePassword` is true, middleware blocks everything except the change-password route.
10. **Response format.**
    - Success: `{ "success": true, "data": ..., "message": "..." }`
    - Error: `{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }`
    - Codes: 400 bad request, 401 not logged in, 403 role or scope denied, 404 not found, 409 duplicate (second check-in, duplicate code/email, edit finalized payroll), 422 business rule (overlap, over balance, invalid dates).
11. **No dummy data.** The database starts empty. First run creates the Admin (see section 11).
12. **MVC pattern.**
    - **Model** = Mongoose schemas in `models/` (data shape, indexes, no HTTP code).
    - **Controller** = thin handlers in `controllers/` (read request, call a service, return a view).
    - **View** = JSON response shapers in `views/` on the backend (for example remove `passwordHash`, hide salary from people who are not allowed to see it). The React app is the visual view for users.
    - **Services layer** sits between controller and model and holds the business rules. It is kept on purpose: the REST API, the AI tools and the unit tests all call the same rules.
    - Golden rules: a controller never queries a model directly; a model never contains business rules or HTTP code; a view never queries the database.
    - Request flow: `route -> middleware (auth, role, scope, validate) -> controller -> service -> model -> view -> JSON`.

---

## 4. Folder structure

### Backend (`/backend`)

```
src/
  config/        env.js, db.js
  models/        M: User, Employee, Department, Designation, LeaveType, Holiday,
                 Settings, Attendance, AttendanceCorrection, LeaveRequest,
                 PayrollRun, Payslip, Announcement, Notification, AuditLog, AiLog
  routes/        one file per module (auth, setup, employees, attendance, leave,
                 payroll, analytics, ai, comms)
  controllers/   C: thin: read request, call service, send view
  views/         V: response shapers (employeeView, payslipView, attendanceView, ...)
  services/      all business rules (authService, employeeService, attendanceService,
                 leaveService, payrollService, analyticsService, aiService,
                 auditService, notificationService)
  rules/         pure functions: attendanceRules, leaveRules, payrollRules, taxSlab
  ai/            llmClient.js, systemPrompt.js, tools.js (tool schemas + handlers)
  middleware/    authenticate, requireRole, scope, validate (zod), errorHandler,
                 rateLimit
  validators/    zod schemas per module
  utils/         dates.js, pdf.js, apiResponse.js, geo.js
  app.js         express app
  server.js      connect DB, listen
tests/           rules tests (attendance, leave days, tax slab, payroll)
.env.example
```

### MVC mapping

| Layer | Folder | Does | Must not |
|---|---|---|---|
| Model | `models/` | Schema, types, indexes | Business rules, HTTP |
| Controller | `controllers/` | Parse request, call service, return view | Query the DB, hold rules |
| View | `views/` | Shape and filter JSON output (hide `passwordHash`, salary by role) | Query the DB |
| Service | `services/`, `rules/` | Business rules, scope, audit | Touch `req` / `res` |

### Frontend (`/frontend`)

```
src/
  api/           axios instance + one file per module
  components/    Layout, Sidebar, Navbar, StatCard, DataTable, Modal, EmptyState,
                 ErrorState, Spinner, StatusBadge, ChatPanel
  context/       AuthContext (token, user, role)
  routes/        ProtectedRoute (login + role), role-based menu config
  pages/
    auth/        Login, ChangePassword, FirstRunSetup
    admin/       Company, Departments, Designations, LeaveTypes, Holidays, Users,
                 AuditLog, AdminDashboard
    hr/          Employees, EmployeeForm, Employee360, AttendanceBoard, Corrections,
                 LeaveInbox, SalaryStructure, PayrollRuns, HrDashboard
    employee/    MyDashboard, CheckIn, MyAttendance, MyLeave, ApplyLeave, MyPayslips, Profile
    shared/      Announcements, Notifications
  hooks/         useAuth, useDebounce
  utils/         format.js, constants.js
```

---

## 5. Data model

| Collection | Key fields | Indexes |
|---|---|---|
| `users` | email, passwordHash, role (`admin`/`hr`/`employee`), employeeId, isActive, mustChangePassword | unique email |
| `employees` | code, name, email, phone, address, gender, departmentId, designationId, joinDate, exitDate, status (`active`/`probation`/`exited`), salary.basic, userId | unique code, unique email |
| `departments` | name | unique name |
| `designations` | name, departmentId (optional) | unique name |
| `leavetypes` | key (`annual`/`sick`/`casual`/`unpaid`), name, yearlyQuota (null = unlimited), paid | unique key |
| `holidays` | date (`YYYY-MM-DD`), name | unique date |
| `settings` (single doc) | companyName, timezone, officeStart, graceMinutes, halfDayHours, weekend, office {lat, lng, radiusM}, setupCompleted | none |
| `attendance` | employeeId, date, checkIn, checkOut, workedMinutes, status (`present`/`late`/`half_day`), source (`web`/`camera`/`correction`) | **unique (employeeId, date)** |
| `attendancecorrections` | employeeId, date, requestedCheckIn, requestedCheckOut, reason, status, decidedBy, comment | employeeId + date |
| `leaverequests` | employeeId, leaveTypeId, startDate, endDate, days, reason, status (`pending`/`approved`/`rejected`/`cancelled`), decidedBy, comment | employeeId + dates |
| `payrollruns` | month (`YYYY-MM`), status (`draft`/`finalized`), createdBy, finalizedBy, totals | **unique month** |
| `payslips` | runId, employeeId, month, basic, hra, medical, gross, workingDays, deductions {absent, unpaid, halfDay}, tax, net | unique (runId, employeeId) |
| `announcements` | title, body, authorId | createdAt |
| `notifications` | userId, type, title, read | userId + read |
| `auditlogs` | actorId, actorRole, action, entity, entityId, before, after, at | at, entity |
| `ailogs` | userId, question, toolsCalled, ok, ms, at | userId + at |

---

## 6. API surface (`/api/v1`)

| Module | Endpoints | Who |
|---|---|---|
| M1 Auth | `POST /auth/login`, `POST /auth/change-password`, `GET /auth/me` | all |
| M2 Setup | `GET /setup/status`, `POST /setup/first-run` (only when no admin exists), `GET/PUT /settings`, CRUD `/departments` `/designations` `/leave-types` `/holidays`, `POST /users/hr`, `PATCH /users/:id/deactivate`, `POST /users/:id/reset-password` | Admin manage, HR view |
| M3 Employees | `POST /employees`, `GET /employees` (search, filters, paging), `GET /employees/:id`, `PATCH /employees/:id`, `PATCH /me/profile` (phone, address only), `POST /employees/import?dryRun=true`, `GET /employees/export` | HR manage, Employee own |
| M4 Attendance | `POST /attendance/check-in`, `POST /attendance/check-out`, `GET /attendance/me?month=`, `GET /attendance/board?date=`, `POST /attendance/corrections`, `GET /attendance/corrections`, `PATCH /attendance/corrections/:id` | per checklist |
| M5 Leave | `POST /leave`, `GET /leave` (scoped), `PATCH /leave/:id/cancel`, `PATCH /leave/:id/decision`, `GET /leave/balance` | per checklist |
| M6 Payroll | `PUT /employees/:id/salary`, `POST /payroll/runs` (create or regenerate draft), `GET /payroll/runs`, `GET /payroll/runs/:id`, `POST /payroll/runs/:id/finalize`, `GET /payslips`, `GET /payslips/:id/pdf` | HR draft, Admin finalize, Employee own |
| M7 Analytics | `GET /analytics/admin`, `GET /analytics/hr`, `GET /analytics/me` (all take `from`, `to`, `departmentId`) | per role |
| M8 AI | `POST /ai/chat`, `POST /ai/summary`, `POST /ai/smart-leave` | per checklist |
| M9 Comms | `GET/POST /announcements`, `GET /notifications`, `PATCH /notifications/:id/read`, `GET /audit` | Admin audit, all read |

---

## 7. Business rules: where each one lives

| Rule (brief section 3) | Implemented in | Unit test |
|---|---|---|
| Employee reads only own `employeeId` rows | `middleware/scope` + services | integration check |
| Settings apply to new records only | status computed at check-in / check-out | yes |
| One attendance per employee per day, second check-in = 409 | unique index + service | yes |
| Late after `officeStart + grace` | `rules/attendanceRules.attendanceStatus` | yes |
| Half day under 5 h worked | same, evaluated at check-out | yes |
| Absent = no record and no approved leave (working day) | `analyticsService` / `attendanceService.dayStatus` | yes |
| Missing checkout = past day, check-in, no check-out | derived on read | yes |
| Leave counts working days only (skip weekend and holidays) | `rules/leaveRules.workingDays` | yes |
| Overlap or over-balance = 422 | `leaveService.apply` | yes |
| Gross = 1.5 x basic (HRA 40%, medical 10%) | `rules/payrollRules` | yes |
| Per day = gross / working days; deduct absent + unpaid + 0.5 x half days | `rules/payrollRules` | yes |
| Prorate joiners and leavers | `rules/payrollRules` | yes |
| Tax slab on gross x 12 | `rules/taxSlab.calcAnnualTax` | yes |
| Only Admin can finalize; finalized = locked | `payrollService` + `requireRole('admin')` | integration check |
| CSV dry run returns row + field + reason | `employeeService.importCsv` | optional |

**Tax slab (annual income = monthly gross x 12):**

| Annual income | Tax |
|---|---|
| up to 600,000 | 0 |
| 600,001 to 1,200,000 | 5% of the amount above 600,000 |
| 1,200,001 to 2,400,000 | 30,000 + 15% of the amount above 1,200,000 |
| 2,400,001 to 3,600,000 | 210,000 + 25% of the amount above 2,400,000 |
| above 3,600,000 | 510,000 + 35% of the amount above 3,600,000 |

---

## 8. Ambiguities in the brief and our decisions

| Question | Decision |
|---|---|
| Does a pending leave count against balance? | Yes. `approved + pending + requested` must not exceed quota, to prevent double booking |
| Can an employee cancel approved leave? | Pending: yes. Approved: only if start date is in the future; the balance returns |
| Monthly tax | `annualTax / 12`, multiplied by the proration factor for joiners and leavers |
| Net pay | `prorated gross - absence deductions - tax` |
| Late days in payroll | No deduction by default. Bonus: "3 lates = 0.5 day" behind a setting |
| `missing_checkout` in payroll | Counts as present |
| Paid approved leave in payroll | No deduction. Unpaid approved leave is deducted |
| Working days in a month | Weekdays (per settings) minus holidays |
| Regenerating a draft | Allowed any time before finalize; it replaces the draft payslips |
| Leaver or deactivated employee | Status `exited`, login deactivated, history kept |
| Who sees salary | Admin, HR, and the employee for their own payslips only. The AI follows the same rule |
| Tokens | Single 8 h JWT, no refresh token (re-login). Simple and secure enough for this scope |

---

## 9. AI design (M8)

**Flow for `POST /ai/chat`:**
1. Authenticate, then check the rate limit (20 per user per hour, counted from `ailogs`).
2. Send to the LLM: system prompt (policy rules + today's date) + user message + **only the tools allowed for that role**.
3. If the model calls a tool, the backend runs the **same service function** as the REST API with the user's scope, then returns the result to the model. Maximum 3 tool rounds.
4. The model writes the final answer. The response carries `aiGenerated: true`. The UI shows an "AI-generated" label.
5. Log to `ailogs`. Timeout is 15 s; on any failure return a friendly fallback.

| Tool | Admin | HR | Employee |
|---|---|---|---|
| `get_headcount` | all | all | no |
| `get_attendance_summary` | all | all | own only |
| `get_late_comers` | all | all | no |
| `get_leave_summary` | all | all | own only |
| `get_my_leave_balance` | yes | yes | yes |
| `get_payroll_summary` | all | all | **no** |
| `search_employees` | all | all | no (no salary field ever returned) |

**"What is {colleague}'s salary?" for an Employee:** the employee has no salary tool, and the system prompt tells the model to refuse politely. Two layers of protection.

**Dashboard summary:** the **backend** computes the KPI JSON with `analyticsService` for the current filters (not trusting numbers sent by the browser), and asks the model for 3 to 5 bullets using only those numbers.

**Smart leave:** the prompt includes today's date and a small calendar of the next 14 days with weekday names, so "next Monday and Tuesday" resolves correctly. The model must return `{type, start, end, reason}`. We validate with Zod; on failure retry once, then show the normal form. The AI never saves anything. The user confirms the pre-filled form.

**Policy Q&A:** section 3 rules are placed in the system prompt. The model answers only from them or says it does not know.

**Roman Urdu (bonus):** add one line in the system prompt: "Reply in the language the user writes in, including Roman Urdu."

---

## 10. Security checklist

- bcrypt (cost 10) for passwords; the temporary password is shown once to HR, then must be changed.
- `helmet`, CORS allowlist (only our frontend URL), `express-rate-limit` on login.
- Zod on every request body and query; Zod objects reject unknown fields, so users cannot send `role` or `salary` through the wrong endpoint.
- NoSQL injection: Zod forces string types; never pass raw `req.body` or `req.query` into a Mongo filter.
- `PATCH /me/profile` accepts only `phone` and `address`.
- Role and scope on every route. Audit log has no write routes.
- `AI_API_KEY`, `JWT_SECRET`, `MONGO_URI` only in env. Commit only `.env.example`.
- Never log passwords, tokens or the AI key.

---

## 11. Environment variables

```
# backend/.env.example
PORT=5000
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAIL=            # optional: creates Admin on first start
ADMIN_PASSWORD=         # optional
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AI_API_KEY=
AI_RATE_LIMIT_PER_HOUR=20

# frontend/.env.example
VITE_API_URL=http://localhost:5000/api/v1
```

**First run:** if `ADMIN_EMAIL` and `ADMIN_PASSWORD` exist and no admin is in the database, create it at startup. Otherwise the frontend calls `GET /setup/status` and shows the First-Run Setup screen (company name + Admin account). `POST /setup/first-run` is rejected once an admin exists.

---

## 12. Team split and working agreement

| Person | Owns |
|---|---|
| **Backend A** | Project skeleton, auth, first-run setup, org setup (M1, M2), employees and CSV (M3), audit and notifications (M9) |
| **Backend B** | Attendance (M4), leave (M5), payroll and PDF (M6), analytics (M7), AI (M8) |
| **Frontend X** | Layout, routing, auth screens, setup screens, employees, attendance, leave |
| **Frontend Y** | Dashboards and charts, payroll and payslips, AI chat panel, announcements, notifications, audit log |

Rules:
- **Agree the API shapes in section 6 first** (15 minutes), so frontend can use mock responses while backend is being built.
- Small commits, one branch per module, merge to `main` often. Never commit `.env`.
- Every backend module is "done" only when: validation added, role and scope checked, audit logged, and the rule functions have a test.

---

## 13. Build order (demo-script driven)

| Step | Work | Done when |
|---|---|---|
| 0 | Repos, env, DB connection, `/health`, **deploy empty backend and frontend** | Live URLs exist |
| 1 | First-run setup, login, change password, role menus, org setup (M1, M2) | Demo step 1 works on the live link |
| 2 | Register employee + login creation, directory, Employee 360 (M3) | Demo step 2 works |
| 3 | Check-in / check-out, calendar, board, corrections (M4) | Late and half-day rules verified |
| 4 | Leave apply, balance, approval inbox (M5) | Overlap and over-balance return 422 |
| 5 | Salary, payroll draft, finalize, payslip PDF (M6) | Admin finalize locks the month |
| 6 | Dashboards and charts (M7) | Numbers match raw records |
| 7 | AI chat, summary, smart leave, policy Q&A (M8) | The 4 judge questions answer correctly |
| 8 | Announcements, notifications, audit log screen (M9) | Audit shows before and after |
| 9 | Polish: empty / loading / error states, mobile 375 px, README, tests, rehearse demo twice | Fresh install demo passes |
| Bonus | Dark mode (already have the theme), Roman Urdu, late penalty, camera + location | Only after step 9 |

**Cut list if time runs out (in this order):** CSV import, camera attendance, attendance corrections UI polish, announcements.
**Never cut:** audit log, finalize lock, scope checks, README.

---

## 14. Deployment plan

1. Atlas M0 cluster, create a DB user, allow `0.0.0.0/0` for the demo, copy `MONGO_URI`.
2. Render: new Web Service from the repo's `/backend`, build `npm install`, start `npm start`, add all env variables.
3. Vercel: import `/frontend`, set `VITE_API_URL` to the Render URL. Keep the `vercel.json` rewrite for React Router.
4. Set `CORS_ORIGIN` on Render to the Vercel URL.
5. cron-job.org pings `https://<render-url>/health` every 10 minutes.
6. Test the full demo script on the **live** link, from a fresh empty database, before submission.

---

## 15. README and submission checklist

README must contain: stack, how to run locally (under 10 minutes), how to create the first Admin, how to set the AI key, environment variables table, what is done and what is not done, hosted link, and **the AI tools used** (declare Claude and the LLM provider).

Submit on https://lms.saylaniit.com/ : public repo link and live app link. Each team member submits both links.
