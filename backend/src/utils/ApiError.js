// Throw this from services. The error handler turns it into the standard JSON error.
export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message)
    this.status = status
    this.errors = errors // [{ field, message }]
  }
}
