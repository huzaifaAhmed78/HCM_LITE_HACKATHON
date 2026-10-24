import { ApiError } from '../utils/ApiError.js'

// validate(zodSchema, 'body' | 'query' | 'params'). Replaces the input with the cleaned data.
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source])
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    throw new ApiError(422, 'Validation failed', errors)
  }
  req[source] = result.data
  next()
}
