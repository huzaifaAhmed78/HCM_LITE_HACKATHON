import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)
schema.index({ userId: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', schema)
