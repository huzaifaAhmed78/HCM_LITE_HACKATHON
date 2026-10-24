import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveTypeKey: { type: String, required: true, lowercase: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    days: { type: Number, required: true }, // working days only (weekends and holidays excluded)
    reason: { type: String, default: '', trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
)
schema.index({ employeeId: 1, startDate: 1 })

export const LeaveRequest = mongoose.model('LeaveRequest', schema)
