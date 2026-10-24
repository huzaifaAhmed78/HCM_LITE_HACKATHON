import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeCode: String,
    name: String,
    departmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    joiningDate: String,
    basic: Number,
    hra: Number,
    medical: Number,
    gross: Number, // full monthly gross (1.5 x basic)
    workingDays: Number, // working days in the month
    eligibleDays: Number, // working days on or after the joining date (proration)
    absentDays: Number,
    unpaidLeaveDays: Number,
    halfDays: Number,
    perDay: Number,
    earnedGross: Number, // gross after joiner proration
    deduction: Number, // (absent + unpaid + 0.5 x half) x perDay
    tax: Number, // monthly tax from the annual slab
    net: Number,
  },
  { _id: false }
)

const schema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true }, // YYYY-MM
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
    workingDays: { type: Number, default: 0 },
    items: [itemSchema],
    totals: {
      employees: { type: Number, default: 0 },
      gross: { type: Number, default: 0 },
      deduction: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      net: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export const PayrollRun = mongoose.model('PayrollRun', schema)
