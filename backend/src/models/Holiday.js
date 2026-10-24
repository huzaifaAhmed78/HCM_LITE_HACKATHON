import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

export const Holiday = mongoose.model('Holiday', schema)
