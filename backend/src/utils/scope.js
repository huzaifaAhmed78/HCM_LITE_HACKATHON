// ONE place that decides what rows a user may read.
// Admin and HR see everything. An Employee only sees rows with their own employeeId.
export function scopeFor(user) {
  return user.role === 'employee' ? { employeeId: user.employeeId } : {}
}
