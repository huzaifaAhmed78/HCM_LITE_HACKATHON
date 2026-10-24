import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (company timezone)
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, default: null },
    status: { type: String, enum: ['present', 'late', 'half_day'], required: true },
    workedMinutes: { type: Number, default: 0 },
    faceDistance: { type: Number, default: null }, // how close the scanned face was to the enrolled one (lower = closer)
    source: { type: String, enum: ['self', 'correction'], default: 'self' },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      distanceM: { type: Number, default: null },
    },
  },
  { timestamps: true }
)
schema.index({ employeeId: 1, date: 1 }, { unique: true })

export const Attendance = mongoose.model('Attendance', schema)
