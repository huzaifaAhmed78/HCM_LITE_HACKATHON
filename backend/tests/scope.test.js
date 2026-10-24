import test from 'node:test'
import assert from 'node:assert/strict'
import { scopeFor } from '../src/utils/scope.js'

test('admin and hr see everything', () => {
  assert.deepEqual(scopeFor({ role: 'admin', employeeId: null }), {})
  assert.deepEqual(scopeFor({ role: 'hr', employeeId: 'e1' }), {})
})

test('employee is limited to own employeeId', () => {
  assert.deepEqual(scopeFor({ role: 'employee', employeeId: 'e1' }), { employeeId: 'e1' })
})
