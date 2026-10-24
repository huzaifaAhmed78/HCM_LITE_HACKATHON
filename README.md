# HCM Lite

AI-assisted HR system for Admin, HR and Employees (Saylani Hackathon). The app starts empty: Admin sets up the company, HR registers employees, and every number comes from what people do in the app.

**Stack:** Node 20+, Express, MongoDB (Mongoose), JWT + bcrypt, Zod validation. React 18 + Vite + Tailwind. AI through any OpenAI-compatible API with tool calling (Groq by default). Face attendance with `@vladmandic/face-api` in the browser.

## Run it (under 10 minutes)

```bash
# 1. Backend
cd backend
cp .env.example .env        # fill MONGO_URI and JWT_SECRET (and AI_API_KEY for the AI features)
npm install
npm run dev                 # http://localhost:5000  (health: /health)

# 2. Frontend (new terminal)
cd frontend
npm install
mkdir -p public/models && cp node_modules/@vladmandic/face-api/model/* public/models/   # face models (PowerShell: see FACE-SETUP.txt)
npm run dev                 # http://localhost:5173
```

Tests: `cd backend && npm test` (tax slab, payroll maths, scope and validators).

## First Admin

Open the app. On a fresh database it shows **First-run setup** (company name, timezone, Admin name, email, password). Alternatively set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` and the Admin is created at startup.

Then: Admin creates a department, a designation and an HR login. HR registers employees (a temporary password is shown once and must be changed at first sign-in).

## AI key

Set these in `backend/.env` (or the host's environment settings). The key never reaches the browser.

```
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AI_API_KEY=your_key
AI_RATE_LIMIT_PER_HOUR=20
```

Any OpenAI-compatible provider with tool calling works (for example Gemini's OpenAI endpoint). Without a key the app works normally and AI features show a friendly "not configured" message.

## Deploy (all free tiers)

1. **MongoDB Atlas:** create a free cluster, a database user, allow `0.0.0.0/0`, copy the connection string.
2. **Render (backend):** New Web Service from the repo, root directory `backend`, build `npm install`, start `npm start`. Environment: `MONGO_URI`, `JWT_SECRET` (long random text), `CORS_ORIGIN` (your Vercel URL, no trailing slash; commas allowed for several), `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `DEFAULT_TIMEZONE` (for example `Asia/Karachi`). Do not set `ADMIN_EMAIL` if judges should see first-run setup. Health check path: `/health`. Free instances sleep, so open the URL once before the demo.
3. **Vercel (frontend):** import the repo, root directory `frontend`, framework Vite. Environment: `VITE_API_URL=https://YOUR-RENDER-URL/api/v1`. `vercel.json` already rewrites all routes to `index.html`. Commit `frontend/public/models` so face models are served.

Camera works only on `https` or `localhost`.

## What is built

| Module | Status |
|---|---|
| M1 Auth and access | JWT login, 3 roles, bcrypt, role + data scope on every route, forced password change |
| M2 Organization | Company settings (hours, grace, half day, weekend, timezone, office location), departments, designations, leave types and quotas, holidays, HR logins |
| M3 Employees | Directory with server-side search, filters, paging, Employee profile, salary (basic, HRA 40%, medical 10%) |
| M4 Attendance | Web check-in/out (server time), late and half day rules, one record per day (409), corrections with approval, daily board, calendar, face recognition + location radius (bonus) |
| M5 Leave | Working-day count, balance, overlap and over-balance = 422, approval inbox with comment, cancel |
| M6 Payroll | HR creates draft, Admin finalizes and locks, joiner proration, tax slab, payslip PDF (HR/Admin any employee, employee only own after finalize) |
| M7 Dashboards | Admin, HR and Employee dashboards, all numbers from server aggregation, date and department filters |
| M8 AI | Chat with tools (scoped to the user), dashboard summary, smart leave, policy Q&A, Roman Urdu, rate limit, 15 s timeout, `ai_logs`, "AI-generated" labels |
| M9 Comms and audit | Announcements, in-app notifications (leave decisions, corrections, payslips), append-only audit log with before/after JSON |

## Not done or simplified

- CSV import and export of employees.
- Leavers' proration: the employee record has no exit date.
- Attrition is estimated from employees marked inactive in the range (no history table). Gender is not captured, so there is no gender chart.
- Notification bell refreshes every 30 seconds (no websockets).
- Mobile app (web camera attendance is included instead).
- Late penalty rule, attrition risk score, anomaly flags, dark mode.

## Layout

```
backend/src  routes -> services (all rules) -> models;  validators (Zod);  middleware (auth, role, validate)
frontend/src pages, components, api.js (single fetch wrapper)
docs/        API_CONTRACT.md, DOCS.md
```
