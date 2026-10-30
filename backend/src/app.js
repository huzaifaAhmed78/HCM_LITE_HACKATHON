import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.corsOrigin.split(',').map((o) => o.trim()) })) // comma separated list is allowed
app.use(express.json({ limit: '3mb' }))

app.get('/health', (req, res) => res.json({ status: 'ok' })) // used by the keep-alive ping
app.use('/api/v1', routes)

app.use(notFound)
app.use(errorHandler)

export default app
