import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// Face models ship inside the @vladmandic/face-api package (node_modules/@vladmandic/face-api/model).
// This plugin serves them at /models in dev and copies them into dist/models on build,
// so you do not have to download or copy anything by hand.
function faceModels() {
  const dir = path.resolve('node_modules/@vladmandic/face-api/model')
  const types = { '.json': 'application/json', '.bin': 'application/octet-stream' }
  return {
    name: 'face-models',
    configureServer(server) {
      server.middlewares.use('/models', (req, res, next) => {
        const file = path.join(dir, decodeURIComponent((req.url || '').split('?')[0]))
        if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next()
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
        fs.createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      if (!fs.existsSync(dir)) return
      const out = path.resolve('dist/models')
      fs.mkdirSync(out, { recursive: true })
      for (const f of fs.readdirSync(dir)) {
        if (/\.(json|bin)$/.test(f)) fs.copyFileSync(path.join(dir, f), path.join(out, f))
      }
    },
  }
}

// In dev, /api is proxied to the backend, so no CORS setup is needed locally.
export default defineConfig({
  plugins: [react(), tailwindcss(), faceModels()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } },
})
