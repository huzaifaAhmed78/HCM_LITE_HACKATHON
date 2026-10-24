import mongoose from 'mongoose'

const schema = new mongoose.Schema({ name: { type: String, required: true, trim: true } }, { timestamps: true })
schema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } }) // case-insensitive unique

export const Department = mongoose.model('Department', schema)
