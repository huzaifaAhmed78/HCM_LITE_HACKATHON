import mongoose from 'mongoose'

// One face template per employee: 128 numbers computed in the browser. No photo is stored.
const schema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    descriptor: { type: [Number], required: true, validate: (v) => v.length === 128 },
    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export const FaceProfile = mongoose.model('FaceProfile', schema)
