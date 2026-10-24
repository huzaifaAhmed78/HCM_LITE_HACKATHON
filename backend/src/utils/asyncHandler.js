// Lets controllers use async/await without try/catch. Errors go to errorHandler.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
