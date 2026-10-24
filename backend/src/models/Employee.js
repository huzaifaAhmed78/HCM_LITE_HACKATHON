import mongoose from 'mongoose'

const employeeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeCode: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', required: true },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    basic: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

export const Employee = mongoose.model('Employee', employeeSchema)