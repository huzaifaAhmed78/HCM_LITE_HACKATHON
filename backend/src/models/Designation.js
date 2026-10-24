import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  },
  { timestamps: true }
)
schema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })

export const Designation = mongoose.model('Designation', schema)
