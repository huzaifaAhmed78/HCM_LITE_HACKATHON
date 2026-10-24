import 'dotenv/config'

for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) throw new Error(`Missing env variable ${key}. Copy .env.example to .env and fill it in.`)
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  companyName: process.env.COMPANY_NAME || 'My Company',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC',
}
