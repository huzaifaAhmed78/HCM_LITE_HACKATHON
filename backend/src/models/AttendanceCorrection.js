import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true },
    checkIn: { type: String, required: true }, // HH:MM company time
    checkOut: { type: String, default: null },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
)

export const AttendanceCorrection = mongoose.model('AttendanceCorrection', schema)
