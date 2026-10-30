import test from 'node:test'
import assert from 'node:assert/strict'
import { annualTax, computePayslip } from '../src/services/payrollService.js'

test('tax slab boundaries match the brief', () => {
  assert.equal(annualTax(600000), 0)
  assert.equal(annualTax(1200000), 30000)
  assert.equal(annualTax(1800000), 120000) // 150,000 gross x 12
  assert.equal(annualTax(2400000), 210000)
  assert.equal(annualTax(3600000), 510000)
  assert.equal(annualTax(4000000), 650000)
})

test('basic 100000 gives gross 150000 and monthly tax 10000', () => {
  const p = computePayslip({ basic: 100000, workingDays: 20, eligibleDays: 20, absentDays: 0, unpaidLeaveDays: 0, halfDays: 0 })
  assert.equal(p.gross, 150000)
  assert.equal(p.tax, 10000)
  assert.equal(p.net, 140000)
})

test('deductions: absent + unpaid + half a day per half day', () => {
  const p = computePayslip({ basic: 100000, workingDays: 20, eligibleDays: 20, absentDays: 1, unpaidLeaveDays: 1, halfDays: 2 })
  assert.equal(p.perDay, 7500)
  assert.equal(p.deduction, 7500 * 3)
  assert.equal(p.net, 150000 - 22500 - 10000)
})

test('joiner is prorated', () => {
  const p = computePayslip({ basic: 100000, workingDays: 20, eligibleDays: 10, absentDays: 0, unpaidLeaveDays: 0, halfDays: 0 })
  assert.equal(p.earnedGross, 75000)
  assert.equal(p.tax, 5000)
  assert.equal(p.net, 70000)
})

test('rejects invalid payroll inputs instead of calculating misleading pay', () => {
  assert.throws(() => computePayslip({ basic: -1, workingDays: 20, eligibleDays: 20, absentDays: 0, unpaidLeaveDays: 0, halfDays: 0 }), /Invalid payroll value/)
  assert.throws(() => computePayslip({ basic: 100000, workingDays: 20, eligibleDays: 21, absentDays: 0, unpaidLeaveDays: 0, halfDays: 0 }), /Eligible days cannot exceed working days/)
  assert.throws(() => computePayslip({ basic: 100000, workingDays: 20, eligibleDays: 2, absentDays: 3, unpaidLeaveDays: 0, halfDays: 0 }), /deductions exceed/)
})

test('configured allowance percentages change gross consistently', () => {
  const p = computePayslip({ basic: 100000, workingDays: 20, eligibleDays: 20, absentDays: 0, unpaidLeaveDays: 0, halfDays: 0, hraRatePercent: 25, medicalRatePercent: 8 })
  assert.equal(p.hra, 25000)
  assert.equal(p.medical, 8000)
  assert.equal(p.gross, 133000)
})
