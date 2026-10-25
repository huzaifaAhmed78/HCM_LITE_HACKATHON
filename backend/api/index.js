// Vercel entry point. Vercel runs this as a serverless function instead of src/server.js
// (which needs a long-running port). The database connects once and is reused while the function is warm.
import { connectDB } from '../src/config/db.js'
import { ensureAdminFromEnv } from '../src/services/setupService.js'
import app from '../src/app.js'

let ready
const start = () => {
  ready ||= connectDB()
    .then(() => ensureAdminFromEnv())
    .catch((e) => { ready = undefined; throw e }) // try again on the next request
  return ready
}

export default async function handler(req, res) {
  try {
    await start()
  } catch (e) {
    console.error('Startup failed:', e.message)
    return res.status(500).json({ success: false, message: 'Database connection failed. Check MONGO_URI and Atlas network access.', errors: [] })
  }
  return app(req, res)
}
