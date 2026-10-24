import { Settings } from '../models/Settings.js'
import { ApiError } from '../utils/ApiError.js'
import { docView } from '../views/docView.js'
import { logAudit } from './auditService.js'

async function load() {
  const settings = await Settings.findOne({ key: 'main' })
  if (!settings) throw new ApiError(404, 'Company is not set up yet')
  return settings
}

export const getSettings = load

// Partial update. Changes apply to NEW records only (old attendance is never recalculated).
export async function updateSettings(actor, input) {
  const settings = await load()
  const before = docView(settings)

  for (const [field, value] of Object.entries(input)) {
    if (field === 'office') for (const [k, v] of Object.entries(value)) settings.set(`office.${k}`, v)
    else settings.set(field, value)
  }
  await settings.save()

  await logAudit({ actor, action: 'settings.update', entity: 'Settings', entityId: settings._id, before, after: docView(settings) })
  return settings
}
