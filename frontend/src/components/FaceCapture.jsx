import { useEffect, useRef, useState } from 'react'
import { Btn } from './bits.jsx'

// Opens the webcam, finds one face and returns its 128-number descriptor.
// mode "enroll" takes 3 samples and averages them; "verify" takes 1.
// Model files are served at /models (see vite.config.js).
// Tries the local /models folder first, then falls back to public CDNs, so it works
// even if the model files were never copied into the project.
const MODEL_SOURCES = [
  '/models',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model',
  'https://vladmandic.github.io/face-api/model',
]

// A source is usable only if it returns real JSON (not the app's index.html).
// Returns null when fine, otherwise a short reason.
const checkSource = async (base) => {
  try {
    const r = await fetch(`${base}/tiny_face_detector_model-weights_manifest.json`)
    if (!r.ok) return `file not found (HTTP ${r.status})`
    JSON.parse(await r.text())
    return null
  } catch (e) { return `not reachable or not JSON (${e?.message || e})` }
}

let apiPromise
const loadFaceApi = () => {
  apiPromise ||= import('@vladmandic/face-api')
    .then(async (faceapi) => {
      const problems = []
      for (const base of MODEL_SOURCES) {
        const bad = await checkSource(base)
        if (bad) { problems.push(`${base}: ${bad}`); continue }
        try {
          await faceapi.tf?.ready?.()
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(base),
            faceapi.nets.faceLandmark68Net.loadFromUri(base),
            faceapi.nets.faceRecognitionNet.loadFromUri(base),
          ])
          return faceapi
        } catch (e) { problems.push(`${base}: loading failed (${e?.message || e})`) }
      }
      throw new Error(`Face models could not be loaded. ${problems.join(' | ')}`)
    })
    .catch((e) => { apiPromise = undefined; throw e }) // allow a retry after a failure
  return apiPromise
}

export default function FaceCapture({ mode = 'verify', onDone, onCancel }) {
  const video = useRef(null)
  const stream = useRef(null)
  const [msg, setMsg] = useState('Starting camera...')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const [faceapi, media] = await Promise.all([loadFaceApi(), navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480 } })])
        if (dead) return media.getTracks().forEach((t) => t.stop())
        stream.current = media
        video.current.srcObject = media
        await video.current.play()
        setReady(true)
        setMsg('Look at the camera, then press Scan.')
        video.current.faceapi = faceapi
      } catch (e) {
        setMsg(e?.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access and try again.' : `Could not start the camera or face models: ${e?.message || e}`)
      }
    })()
    return () => { dead = true; stream.current?.getTracks().forEach((t) => t.stop()) }
  }, [])

  const sample = async () => {
    const faceapi = video.current.faceapi
    const found = await faceapi.detectAllFaces(video.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceLandmarks().withFaceDescriptors()
    if (found.length === 0) throw new Error('No face found. Move closer and face the camera.')
    if (found.length > 1) throw new Error('More than one face in view. Only one person please.')
    return Array.from(found[0].descriptor)
  }

  const scan = async () => {
    setBusy(true)
    try {
      const n = mode === 'enroll' ? 3 : 1
      const all = []
      for (let i = 0; i < n; i++) {
        setMsg(n > 1 ? `Scanning ${i + 1} of ${n}...` : 'Scanning...')
        all.push(await sample())
        if (i < n - 1) await new Promise((r) => setTimeout(r, 500))
      }
      const avg = all[0].map((_, i) => all.reduce((s, d) => s + d[i], 0) / all.length)
      stream.current?.getTracks().forEach((t) => t.stop())
      onDone(avg)
    } catch (e) {
      setMsg(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 rounded-lg border border-sand bg-white p-4">
      <div className="mb-2 text-sm font-medium">{mode === 'enroll' ? 'Register face' : 'Verify face'}</div>
      <video ref={video} muted playsInline className="mb-3 aspect-[4/3] w-full max-w-sm rounded-md bg-black object-cover" style={{ transform: 'scaleX(-1)' }} />
      <div className="mb-3 text-sm text-ink/70">{msg}</div>
      <div className="flex gap-2">
        <Btn disabled={!ready || busy} onClick={scan}>Scan</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  )
}

