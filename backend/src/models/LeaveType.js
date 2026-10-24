import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    yearlyQuota: { type: Number, default: null }, // null = unlimited (unpaid leave)
    paid: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const LeaveType = mongoose.model('LeaveType', schema)
