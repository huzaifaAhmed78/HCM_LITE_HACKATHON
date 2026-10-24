import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, default: '' },
    authorRole: { type: String, default: '' },
  },
  { timestamps: true }
)
schema.index({ createdAt: -1 })

export const Announcement = mongoose.model('Announcement', schema)
