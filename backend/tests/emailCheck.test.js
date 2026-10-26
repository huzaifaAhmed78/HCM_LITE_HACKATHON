import test from 'node:test'
import assert from 'node:assert/strict'
import { emailProblem } from '../src/utils/emailCheck.js'

test('common mistyped endings are caught', () => {
  for (const e of ['ali@gmail.con', 'ali@company.con', 'ali@company.cmo', 'ali@company.ocm', 'ali@company.vom', 'ali@gmial.com', 'ali@gmail.co', 'ali@hotmial.com', 'Ali@Yahoo.CON']) {
    assert.ok(emailProblem(e), `${e} should be flagged`)
  }
})

test('normal emails pass', () => {
  for (const e of ['ali@gmail.com', 'ali.khan@company.com', 'a_b@mail.company.pk', 'hr@startup.io', 'ali@outlook.com', 'ali@yahoo.co.uk', 'ali@company.cm', 'x@y.net', 'ali@uni.edu.pk']) {
    assert.equal(emailProblem(e), null, `${e} should pass`)
  }
})

test('the message names the fix', () => {
  assert.match(emailProblem('ali@gmail.con'), /gmail\.com/)
  assert.match(emailProblem('ali@company.con'), /\.com/)
})

test('non-email text is left to the normal format check', () => {
  assert.equal(emailProblem('not-an-email'), null)
  assert.equal(emailProblem(''), null)
  assert.equal(emailProblem(undefined), null)
})
