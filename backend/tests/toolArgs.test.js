import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanArgs, nullableOptional, parseJson } from '../src/ai/toolArgs.js'

test('cleanArgs drops null, empty and "all" values but keeps real ones', () => {
  assert.deepEqual(cleanArgs({ department: null, from: '', to: 'All', limit: 5 }), { limit: 5 })
  assert.deepEqual(cleanArgs({ department: 'Engineering' }), { department: 'Engineering' })
  assert.deepEqual(cleanArgs({ department: 'Whole Company' }), {})
})

test('cleanArgs survives bad input', () => {
  assert.deepEqual(cleanArgs(null), {})
  assert.deepEqual(cleanArgs([1, 2]), {})
  assert.deepEqual(cleanArgs('x'), {})
})

test('nullableOptional lets optional params be null but keeps required ones strict', () => {
  const out = nullableOptional({
    type: 'object',
    properties: { department: { type: 'string' }, query: { type: 'string' }, limit: { type: 'integer' } },
    required: ['query'],
  })
  assert.deepEqual(out.properties.department.type, ['string', 'null'])
  assert.deepEqual(out.properties.limit.type, ['integer', 'null'])
  assert.equal(out.properties.query.type, 'string')
})

test('parseJson handles code fences', () => {
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 })
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 })
})
