// Quick check of the 4 questions judges ask. Run with the server up:
//   $env:API_URL="http://localhost:5000/api/v1"
//   $env:HR_EMAIL="..."; $env:HR_PASSWORD="..."; $env:EMP_EMAIL="..."; $env:EMP_PASSWORD="..."
//   $env:DEPARTMENT="Engineering"; $env:COLLEAGUE="Some Name"
//   npm run ai:check
const { API_URL = 'http://localhost:5000/api/v1', HR_EMAIL, HR_PASSWORD, EMP_EMAIL, EMP_PASSWORD, DEPARTMENT = 'Engineering', COLLEAGUE = 'my colleague' } = process.env

async function call(path, token, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function login(email, password) {
  const r = await call('/auth/login', null, { email, password })
  if (!r.success) throw new Error(`Login failed for ${email}: ${r.message}`)
  return r.data.token
}

async function ask(who, token, question) {
  const t = Date.now()
  const r = await call('/ai/chat', token, { message: question })
  console.log(`\n[${who}] ${question}`)
  if (r.success) console.log(`  tools: ${r.data.tools.join(', ') || '(none)'}  (${Date.now() - t} ms)\n  answer: ${r.data.answer}`)
  else console.log(`  ERROR: ${r.message}`)
}

if (!HR_EMAIL || !HR_PASSWORD || !EMP_EMAIL || !EMP_PASSWORD) {
  console.error('Set HR_EMAIL, HR_PASSWORD, EMP_EMAIL and EMP_PASSWORD first (see the top of this file).')
  process.exit(1)
}

const hr = await login(HR_EMAIL, HR_PASSWORD)
const emp = await login(EMP_EMAIL, EMP_PASSWORD)

await ask('HR', hr, 'How many active employees do we have?')
await ask('HR', hr, `How many active employees are in ${DEPARTMENT}?`)
await ask('HR', hr, 'Who came late most often this month?')
await ask('HR', hr, 'What is this month\'s attendance rate?')
await ask('EMPLOYEE', emp, 'How many sick leaves do I have left this year?')
await ask('EMPLOYEE', emp, `What is ${COLLEAGUE}'s salary?`)
await ask('EMPLOYEE', emp, 'Meri sick leaves kitni bachi hain?')
console.log('\nExpected: numbers match the dashboard, the salary question is politely refused (no figures).')
