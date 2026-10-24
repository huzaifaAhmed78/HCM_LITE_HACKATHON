import { ApiError } from '../utils/ApiError.js'

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

// Every error leaves the API in the same shape: { success: false, message, errors }
export function errorHandler(err, req, res, next) {
  let status = 500
  let message = 'Something went wrong on the server'
  let errors = []

  if (err instanceof ApiError) {
    status = err.status
    message = err.message
    errors = err.errors
  } else if (err.code === 11000) {
    status = 409
    const field = Object.keys(err.keyPattern || {})[0] || 'value'
    message = `Duplicate ${field}`
    errors = [{ field, message: `This ${field} already exists` }]
  } else if (err.name === 'CastError') {
    status = 400
    message = 'Invalid id format'
  } else {
    console.error(err) // unexpected: log it, but never leak details to the client
  }

  res.status(status).json({ success: false, message, errors })
}
