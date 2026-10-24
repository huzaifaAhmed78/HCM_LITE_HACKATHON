const r2 = (n) => Math.round(n * 100) / 100

// HRA 40% + medical 10% of basic, so gross = 1.5 x basic
export const salaryOf = (basic) => {
  const hra = r2(basic * 0.4)
  const medical = r2(basic * 0.1)
  return { basic, hra, medical, gross: r2(basic + hra + medical) }
}

const ref = (v) => (v && v._id ? { id: String(v._id), name: v.name } : v ? { id: String(v) } : null)

export const employeeView = (e) => ({
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
  salary: salaryOf(e.basic),
  createdAt: e.createdAt,
})