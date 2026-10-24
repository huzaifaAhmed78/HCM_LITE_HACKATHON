import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { Settings } from '../models/Settings.js'
import { ApiError } from '../utils/ApiError.js'
import { hashPassword, signToken } from './authService.js'
import { logAudit } from './auditService.js'
import { seedDefaultLeaveTypes } from './orgService.js'

export async function getSetupStatus() {
  return { setupCompleted: Boolean(await User.exists({ role: 'admin' })) }
}

async function createCompanyAndAdmin({ companyName, timezone, adminName, email, password }) {
  await Settings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { companyName, timezone } }, { upsert: true })

  await seedDefaultLeaveTypes()

  const admin = await User.create({
    name: adminName,
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
  })

  await logAudit({ actor: { id: admin._id, role: 'admin' }, action: 'setup.first_run', entity: 'Settings', after: { companyName, timezone } })
  return admin
}

// Called by POST /setup/first-run. Works only while no Admin exists.
export async function firstRun(input) {
  if ((await getSetupStatus()).setupCompleted) throw new ApiError(409, 'Setup is already completed')
  const admin = await createCompanyAndAdmin(input)
  return { token: signToken(admin), user: admin }
}

// Called at server start. If ADMIN_EMAIL and ADMIN_PASSWORD are set and no Admin exists, create one.
export async function ensureAdminFromEnv() {
  if (!env.adminEmail || !env.adminPassword) return
  if ((await getSetupStatus()).setupCompleted) return

  await createCompanyAndAdmin({
    companyName: env.companyName,
    timezone: env.defaultTimezone,
    adminName: 'Admin',
    email: env.adminEmail.toLowerCase(),
    password: env.adminPassword,
  })
  console.log(`Admin created from env: ${env.adminEmail}`)
}
