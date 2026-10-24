import test from 'node:test'
import assert from 'node:assert/strict'
import { isoDate, hhmm, timezone } from '../src/validators/common.js'
import { settingsUpdate } from '../src/validators/orgValidators.js'
import { generateTempPassword } from '../src/utils/tempPassword.js'

test('isoDate accepts real dates only', () => {
  assert.equal(isoDate.safeParse('2026-10-24').success, true)
  assert.equal(isoDate.safeParse('2026-02-30').success, false)
  assert.equal(isoDate.safeParse('24-10-2026').success, false)
})

test('hhmm and timezone', () => {
  assert.equal(hhmm.safeParse('09:00').success, true)
  assert.equal(hhmm.safeParse('9:00').success, false)
  assert.equal(timezone.safeParse('UTC').success, true)
  assert.equal(timezone.safeParse('Mars/Base').success, false)
})

test('settings update rejects unknown fields and bad values', () => {
  assert.equal(settingsUpdate.safeParse({ graceMinutes: 15, office: { radiusM: 150 } }).success, true)
  assert.equal(settingsUpdate.safeParse({ role: 'admin' }).success, false)
  assert.equal(settingsUpdate.safeParse({ weekend: [0, 0] }).success, false)
})

test('temporary password has letters and digits', () => {
  const p = generateTempPassword()
  assert.ok(p.length >= 10 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p))
})
