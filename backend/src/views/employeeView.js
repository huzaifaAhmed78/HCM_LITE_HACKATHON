const r2 = (n) => Math.round(n * 100) / 100

// Defaults are 40% HRA and 10% medical; payroll can pass configured rates.
export const salaryOf = (basic, rates = {}) => {
  const hraRatePercent = Number.isFinite(rates.hraRatePercent) ? rates.hraRatePercent : 40
  const medicalRatePercent = Number.isFinite(rates.medicalRatePercent) ? rates.medicalRatePercent : 10
  const hra = r2(basic * hraRatePercent / 100)
  const medical = r2(basic * medicalRatePercent / 100)
  return { basic, hra, medical, gross: r2(basic + hra + medical) }
}

const ref = (v) => (v && v._id ? { id: String(v._id), name: v.name } : v ? { id: String(v) } : null)

export const employeeView = (e, rates = {}) => ({
  id: String(e._id),
  employeeCode: e.employeeCode,
  name: e.name,
  email: e.email,
  phone: e.phone,
  address: e.address,
  department: ref(e.departmentId),
  designation: ref(e.designationId),
  joiningDate: e.joiningDate,
  status: e.status,
  salary: salaryOf(e.basic, rates),
  createdAt: e.createdAt,
})