import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Btn, Card, Err, Field, inputCls, useLoad } from '../components/bits.jsx'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ZONES = (() => { try { return Intl.supportedValuesOf('timeZone') } catch { return ['UTC', 'Asia/Karachi'] } })()

export default function Settings() {
  const { user } = useAuth()
  const canEdit = user.role === 'admin'
  const { data, error, reload } = useLoad(() => api('/settings'), [])
  const [f, setF] = useState(null)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (data) setF({ companyName: data.companyName, timezone: data.timezone, officeStart: data.officeStart, graceMinutes: data.graceMinutes, halfDayHours: data.halfDayHours, weekend: data.weekend, lat: data.office?.lat ?? '', lng: data.office?.lng ?? '', radiusM: data.office?.radiusM ?? 150 })
  }, [data])

  if (!f) return <div><Err error={error} /><p className="text-sm text-gray-400">Loading settings...</p></div>
  const set = (k, v) => { setOk(false); setF({ ...f, [k]: v }) }
  const toggleDay = (d) => set('weekend', f.weekend.includes(d) ? f.weekend.filter((x) => x !== d) : [...f.weekend, d])
  const here = () => navigator.geolocation?.getCurrentPosition((p) => setF({ ...f, lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) }), () => setErr({ message: 'Could not read your location. Allow location access or type the numbers.' }), { enableHighAccuracy: true })

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null); setOk(false)
    const body = {
      companyName: f.companyName, timezone: f.timezone, officeStart: f.officeStart,
      graceMinutes: Number(f.graceMinutes), halfDayHours: Number(f.halfDayHours), weekend: f.weekend,
      office: { radiusM: Number(f.radiusM), ...(f.lat !== '' && f.lng !== '' ? { lat: Number(f.lat), lng: Number(f.lng) } : {}) },
    }
    try { await api('/settings', { method: 'PUT', body }); setOk(true); await reload() } catch (x) { setErr(x) } finally { setBusy(false) }
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Company settings</h1>
      <form onSubmit={save}>
        <fieldset disabled={!canEdit || busy}>
          <Card title="Company">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company name"><input className={inputCls} value={f.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
              <Field label="Timezone (decides late and absent)">
                <select className={inputCls} value={f.timezone} onChange={(e) => set('timezone', e.target.value)}>
                  {(ZONES.includes(f.timezone) ? ZONES : [f.timezone, ...ZONES]).map((z) => <option key={z}>{z}</option>)}
                </select>
              </Field>
            </div>
          </Card>
          <Card title="Office hours">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Office start"><input type="time" className={inputCls} value={f.officeStart} onChange={(e) => set('officeStart', e.target.value)} /></Field>
              <Field label="Grace (minutes)"><input type="number" min="0" max="120" className={inputCls} value={f.graceMinutes} onChange={(e) => set('graceMinutes', e.target.value)} /></Field>
              <Field label="Half day under (hours)"><input type="number" min="1" max="12" step="0.5" className={inputCls} value={f.halfDayHours} onChange={(e) => set('halfDayHours', e.target.value)} /></Field>
            </div>
            <div className="mt-3 text-sm">
              <span className="mb-1 block text-xs text-gray-600">Weekend</span>
              <div className="flex flex-wrap gap-3">{DAYS.map((d, i) => <label key={d} className="flex items-center gap-1"><input type="checkbox" checked={f.weekend.includes(i)} onChange={() => toggleDay(i)} />{d}</label>)}</div>
            </div>
          </Card>
          <Card title="Office location (for camera attendance)">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Latitude"><input type="number" step="any" className={inputCls} value={f.lat} onChange={(e) => set('lat', e.target.value)} /></Field>
              <Field label="Longitude"><input type="number" step="any" className={inputCls} value={f.lng} onChange={(e) => set('lng', e.target.value)} /></Field>
              <Field label="Radius (metres)"><input type="number" min="10" max="5000" className={inputCls} value={f.radiusM} onChange={(e) => set('radiusM', e.target.value)} /></Field>
            </div>
            {canEdit && <Btn type="button" variant="ghost" className="mt-3" onClick={here}>Use my current location</Btn>}
            <p className="mt-2 text-xs text-gray-500">Leave latitude and longitude empty to skip the location check.</p>
          </Card>
        </fieldset>
        <Err error={err} />
        {canEdit ? (
          <div className="flex items-center gap-3"><Btn disabled={busy}>Save settings</Btn>{ok && <span className="text-sm text-green-700">Saved. Changes apply to new records only.</span>}</div>
        ) : <p className="text-sm text-gray-500">Only Admin can change settings.</p>}
      </form>
    </div>
  )
}
