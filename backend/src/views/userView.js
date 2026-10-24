// Decides what the outside world may see of a user. passwordHash never leaves the server.
export function userView(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId ? String(user.employeeId) : null,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  }
}
