import mongoose from 'mongoose'

// Single document (key = 'main'). Defaults come from the brief.
// Changing settings affects NEW records only.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    companyName: { type: String, required: true, trim: true },
    timezone: { type: String, default: 'UTC' },
    officeStart: { type: String, default: '09:00' },
    graceMinutes: { type: Number, default: 15 },
    halfDayHours: { type: Number, default: 5 },
    weekend: { type: [Number], default: [0, 6] }, // 0 = Sunday ... 6 = Saturday
    office: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      radiusM: { type: Number, default: 150 },
    },
  },
  { timestamps: true }
)

export const Settings = mongoose.model('Settings', settingsSchema)
