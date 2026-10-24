import mongoose from 'mongoose'

// Every AI call is logged (also used for the per-user hourly limit).
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: String,
  kind: { type: String, enum: ['chat', 'summary', 'smart_leave'], required: true },
  prompt: { type: String, default: '' },
  tools: { type: [String], default: [] },
  response: { type: String, default: '' },
  ok: { type: Boolean, default: true },
  error: { type: String, default: '' },
  ms: { type: Number, default: 0 },
  at: { type: Date, default: Date.now, index: true },
})

export const AiLog = mongoose.model('AiLog', schema)
