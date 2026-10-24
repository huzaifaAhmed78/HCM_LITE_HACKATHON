// Pure helpers for AI tool calls (no database, no env), so they are easy to unit test.

// Models often send null / "" / "all" for optional arguments they do not need.
// Drop those so the tool only sees real values.
const EMPTY_WORDS = new Set(['', 'all', 'none', 'null', 'any', 'all departments', 'company', 'whole company', 'everyone'])

export function cleanArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return {}
  const out = {}
  for (const [key, value] of Object.entries(args)) {
    if (value === null || value === undefined) continue
    if (typeof value === 'string' && EMPTY_WORDS.has(value.trim().toLowerCase())) continue
    out[key] = value
  }
  return out
}

// Tool schemas: every OPTIONAL property also accepts null, so a null from the model is not rejected.
export function nullableOptional(parameters) {
  const required = parameters.required || []
  const properties = {}
  for (const [name, prop] of Object.entries(parameters.properties || {})) {
    properties[name] = required.includes(name) ? prop : { ...prop, type: [prop.type, 'null'] }
  }
  return { ...parameters, properties }
}

// Some models wrap JSON in ```json fences. Strip them before parsing.
export function parseJson(text) {
  const cleaned = String(text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}
