import { Employee } from '../models/Employee.js'
import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'

// Notifications must never break the main action, so every sender swallows its own errors.
async function safe(fn) {
  try { await fn() } catch (err) { console.error('notification failed:', err.message) }
}

export const notifyUsers = (userIds, { title, message = '', link = '' }) =>
  safe(async () => {
    if (!userIds.length) return
    await Notification.insertMany(userIds.map((userId) => ({ userId, title, message, link })))
  })

export const notifyEmployee = (employeeId, payload) =>
  safe(async () => {
    const emp = await Employee.findById(employeeId).select('userId')
    if (emp) await notifyUsers([emp.userId], payload)
  })

export const notifyEmployees = (employeeIds, payload) =>
  safe(async () => {
    const emps = await Employee.find({ _id: { $in: employeeIds } }).select('userId')
    await notifyUsers(emps.map((e) => e.userId), payload)
  })

export const notifyRole = (role, payload) =>
  safe(async () => {
    const users = await User.find({ role, isActive: true }).select('_id')
    await notifyUsers(users.map((u) => u._id), payload)
  })

export async function listMine(actor) {
  const [items, unread] = await Promise.all([
    Notification.find({ userId: actor.id }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ userId: actor.id, read: false }),
  ])
  return { unread, items: items.map((n) => ({ id: String(n._id), title: n.title, message: n.message, link: n.link, read: n.read, createdAt: n.createdAt })) }
}

export async function markRead(actor, id) {
  const n = await Notification.findOneAndUpdate({ _id: id, userId: actor.id }, { read: true })
  if (!n) throw new ApiError(404, 'Notification not found')
}

export const markAllRead = (actor) => Notification.updateMany({ userId: actor.id, read: false }, { read: true })
