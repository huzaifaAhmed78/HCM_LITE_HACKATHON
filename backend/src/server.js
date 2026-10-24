import { env } from './config/env.js'
import { connectDB } from './config/db.js'
import { ensureAdminFromEnv } from './services/setupService.js'
import app from './app.js'

await connectDB()
await ensureAdminFromEnv()

app.listen(env.port, () => console.log(`API running on port ${env.port}`))
