import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useIsMobile } from '../hooks/useIsMobile'

const API = 'https://api.getstormgrid.com'
const C   = { bg: '#0a1628', sidebar: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' }

const MAPBOX_TOKEN = 'pk.eyJ1IjoiamFja2NpMyIsImEiOiJjbXB2YmZt' +
  'YTQwMTRuMnJxMXdubW55b3BsIn0.xHTNNNnD6-0ogHLjK-lKMQ'
mapboxgl.accessToken = MAPBOX_TOKEN

const MATTHEW_STEPS = [
  { dt: 'Oct 6  00:00', precip: 0.0,   stage: 1.41, soilPerm: 0.605, csi: 0.178, pod: 0.295, far: 0.721, lambdaMean: 0.0082 },
  { dt: 'Oct 6  06:00', precip: 0.3,   stage: 1.52, soilPerm: 0.605, csi: 0.185, pod: 0.318, far: 0.708, lambdaMean: 0.0095 },
  { dt: 'Oct 6  12:00', precip: 1.1,   stage: 1.89, soilPerm: 0.605, csi: 0.198, pod: 0.341, far: 0.695, lambdaMean: 0.0112 },
  { dt: 'Oct 6  18:00', precip: 2.8,   stage: 2.45, soilPerm: 0.605, csi: 0.219, pod: 0.364, far: 0.674, lambdaMean: 0.0138 },
  { dt: 'Oct 7  00:00', precip: 6.2,   stage: 2.61, soilPerm: 0.605, csi: 0.228, pod: 0.375, far: 0.660, lambdaMean: 0.0167 },
  { dt: 'Oct 7  06:00', precip: 12.3,  stage: 2.72, soilPerm: 0.605, csi: 0.236, pod: 0.386, far: 0.646, lambdaMean: 0.0201 },
  { dt: 'Oct 7  12:00', precip: 38.3,  stage: 2.47, soilPerm: 0.075, csi: 0.219, pod: 0.364, far: 0.671, lambdaMean: 0.0347 },
  { dt: 'Oct 7  18:00', precip: 93.3,  stage: 4.38, soilPerm: 0.075, csi: 0.324, pod: 0.523, far: 0.591, lambdaMean: 0.0892 },
  { dt: 'Oct 8  00:00', precip: 168.3, stage: 6.16, soilPerm: 0.075, csi: 0.362, pod: 0.568, far: 0.538, lambdaMean: 0.1647 },
  { dt: 'Oct 8  06:00', precip: 170.1, stage: 7.82, soilPerm: 0.075, csi: 0.371, pod: 0.591, far: 0.520, lambdaMean: 0.2103 },
  { dt: 'Oct 8  12:00', precip: 172.0, stage: 8.61, soilPerm: 0.075, csi: 0.375, pod: 0.602, far: 0.511, lambdaMean: 0.2318 },
  { dt: 'Oct 8  18:00', precip: 173.1, stage: 9.40, soilPerm: 0.075, csi: 0.380, pod: 0.614, far: 0.500, lambdaMean: 0.2541 },
]
const IRMA_STEPS = [
  { dt: 'Sep 7  00:00', precip: 0.0,   stage: 1.20, soilPerm: 0.605, csi: 0.162, pod: 0.271, far: 0.748, lambdaMean: 0.0063 },
  { dt: 'Sep 7  06:00', precip: 0.8,   stage: 1.38, soilPerm: 0.605, csi: 0.174, pod: 0.295, far: 0.729, lambdaMean: 0.0079 },
  { dt: 'Sep 7  12:00', precip: 3.2,   stage: 1.67, soilPerm: 0.605, csi: 0.189, pod: 0.318, far: 0.710, lambdaMean: 0.0101 },
  { dt: 'Sep 7  18:00', precip: 8.1,   stage: 2.05, soilPerm: 0.605, csi: 0.207, pod: 0.341, far: 0.688, lambdaMean: 0.0134 },
  { dt: 'Sep 8  00:00', precip: 19.4,  stage: 2.34, soilPerm: 0.605, csi: 0.224, pod: 0.364, far: 0.665, lambdaMean: 0.0178 },
  { dt: 'Sep 8  06:00', precip: 42.7,  stage: 2.51, soilPerm: 0.075, csi: 0.241, pod: 0.386, far: 0.641, lambdaMean: 0.0289 },
  { dt: 'Sep 8  12:00', precip: 87.3,  stage: 3.12, soilPerm: 0.075, csi: 0.271, pod: 0.432, far: 0.614, lambdaMean: 0.0521 },
  { dt: 'Sep 8  18:00', precip: 143.2, stage: 4.87, soilPerm: 0.075, csi: 0.312, pod: 0.500, far: 0.577, lambdaMean: 0.0947 },
  { dt: 'Sep 9  00:00', precip: 198.6, stage: 6.43, soilPerm: 0.075, csi: 0.348, pod: 0.545, far: 0.542, lambdaMean: 0.1513 },
  { dt: 'Sep 9  06:00', precip: 231.4, stage: 8.21, soilPerm: 0.075, csi: 0.367, pod: 0.579, far: 0.524, lambdaMean: 0.2048 },
  { dt: 'Sep 9  12:00', precip: 248.7, stage: 9.76, soilPerm: 0.075, csi: 0.381, pod: 0.602, far: 0.509, lambdaMean: 0.2364 },
  { dt: 'Sep 9  18:00', precip: 254.3, stage: 10.91,soilPerm: 0.075, csi: 0.392, pod: 0.614, far: 0.498, lambdaMean: 0.2619 },
]

const STORM_PRESETS = {
  matthew: { label: 'Hurricane Matthew 2016', steps: MATTHEW_STEPS, start: '2016-10-06', end: '2016-10-08' },
  irma:    { label: 'Hurricane Irma 2017',    steps: IRMA_STEPS,    start: '2017-09-07', end: '2017-09-12' },
}

function lambdaToRgba(lambda) {
  const v = Math.min(1, lambda / 0.5)
  if (v < 0.5) { const t = v / 0.5; return [Math.round(t * 255), 200, 0, 175] }
  const t = (v - 0.5) / 0.5; return [255, Math.round((1 - t) * 200), 0, 175]
}

function buildGrid(lambdaMean) {
  const features = []
  const [w, s, e, n] = [-81.84, 30.10, -81.30, 30.34]
  const cols = 26, rows = 18, cw = (e - w) / cols, ch = (n - s) / rows
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const ef = c / cols, noise = Math.sin(c * 2.3 + r * 1.7) * 0.3 + 0.5
    const local = lambdaMean * (0.4 + 1.2 * ef) * (0.7 + 0.6 * noise)
    const [rl, gl, bl] = lambdaToRgba(local)
    features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[w+c*cw,s+r*ch],[w+(c+1)*cw,s+r*ch],[w+(c+1)*cw,s+(r+1)*ch],[w+c*cw,s+(r+1)*ch],[w+c*cw,s+r*ch]]] }, properties: { r:rl, g:gl, b:bl } })
  }
  return { type: 'FeatureCollection', features }
}

export default function MapDashboard({ apiKey: apiKeyProp = 'sg_ent_demo' }) {
  const isMobile       = useIsMobile()
  const mapContainer   = useRef(null)
  const map            = useRef(null)
  const realLayerRef   = useRef(false)
  const [mapLoaded, setMapLoaded]   = useState(false)
  const [storm, setStorm]           = useState('matthew')
  const [step, setStep]             = useState(11)
  const [location, setLocation]     = useState('jacksonville')
  const [locations, setLocations]   = useState([])
  const [startDate, setStartDate]   = useState('2016-10-06')
  const [endDate, setEndDate]       = useState('2016-10-08')
  const [apiKey, setApiKey]         = useState(apiKeyProp)
  const [isRunning, setIsRunning]   = useState(false)
  const [runStatus, setRunStatus]   = useState('')
  const [runResult, setRunResult]   = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)  // mobile only

  const preset  = STORM_PRESETS[storm]
  const steps   = preset.steps
  const cur     = steps[step]
  const maxCsi  = Math.max(...steps.map(s => s.csi))
  const soilSat = cur.soilPerm < 0.1 ? { label: 'SATURATED', color: C.err } : cur.soilPerm < 0.3 ? { label: 'WET', color: C.warn } : { label: 'DRY', color: C.ok }

  useEffect(() => {
    fetch(`${API}/locations`).then(r => r.json()).then(d => setLocations(Object.keys(d.locations || {}))).catch(() => {})
  }, [])

  // Sync date pickers when storm preset changes
  useEffect(() => {
    setStartDate(preset.start)
    setEndDate(preset.end)
    setStep(steps.length - 1)
  }, [storm])

  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-81.65, 30.33], zoom: 11, pitch: 40, bearing: -10,
    })
    map.current.on('load', () => {
      map.current.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 })
      map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 2.0 })
      map.current.addSource('lambda-grid', { type: 'geojson', data: buildGrid(0.01) })
      map.current.addLayer({ id: 'lambda-fill', type: 'fill', source: 'lambda-grid', paint: { 'fill-color': ['rgb', ['get', 'r'], ['get', 'g'], ['get', 'b']], 'fill-opacity': 0.68 } })
      setMapLoaded(true)
    })
    return () => { if (map.current) { map.current.remove(); map.current = null } }
  }, [])

  useEffect(() => {
    if (!mapLoaded) return
    map.current?.getSource('lambda-grid')?.setData(buildGrid(cur.lambdaMean))
  }, [mapLoaded, step, storm])

  async function handleRun() {
    setIsRunning(true); setRunResult(null); setRunStatus('queued')
    try {
      const res = await fetch(`${API}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ location, start_date: startDate, end_date: endDate }),
      })
      const data = await res.json()
      if (!res.ok) { setRunStatus(`Error: ${data.error || res.status}`); setIsRunning(false); return }
      setRunStatus('running')
      const poll = setInterval(async () => {
        const s  = await fetch(`${API}/status/${data.run_id}`, { headers: { 'X-API-Key': apiKey } })
        const sd = await s.json()
        setRunStatus(sd.status)
        if (sd.status === 'complete' || sd.status === 'failed') {
          clearInterval(poll); setIsRunning(false)
          if (sd.status === 'complete') {
            const out = await fetch(`${API}/outputs/${data.run_id}`, { headers: { 'X-API-Key': apiKey } })
            const od  = await out.json()
            setRunResult(od)
            // Update synthetic heatmap with live lambda scalar
            const lv = od.lambda_value ?? od.lambda_irma_2017
            if (lv) map.current?.getSource('lambda-grid')?.setData(buildGrid(lv))
            // Load real flood extent GeoJSON from Supabase if enterprise/municipal
            if (od.outputs && map.current?.isStyleLoaded()) {
              const entry = Object.entries(od.outputs).find(([k]) => k.includes('flood_extent') && k.endsWith('.geojson'))
                         || Object.entries(od.outputs).find(([k]) => k.endsWith('.geojson'))
              if (entry) {
                try {
                  const gj = await fetch(entry[1]).then(r => r.json())
                  if (realLayerRef.current) {
                    map.current.getSource('flood-extent-src').setData(gj)
                  } else {
                    map.current.addSource('flood-extent-src', { type: 'geojson', data: gj })
                    map.current.addLayer({ id: 'flood-fill', type: 'fill', source: 'flood-extent-src', paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.45 } })
                    map.current.addLayer({ id: 'flood-line', type: 'line', source: 'flood-extent-src', paint: { 'line-color': '#ef4444', 'line-width': 1.5, 'line-opacity': 0.9 } })
                    realLayerRef.current = true
                  }
                } catch { /* GeoJSON unavailable — keep synthetic grid */ }
              }
            }
          } else {
            // Fetch error detail from outputs endpoint
            try {
              const errRes  = await fetch(`${API}/outputs/${data.run_id}`, { headers: { 'X-API-Key': apiKey } })
              const errData = await errRes.json()
              setRunStatus(`failed: ${errData.error || 'pipeline error'}`)
            } catch { /* keep generic 'failed' status */ }
          }
        }
      }, 4000)
    } catch (e) { setRunStatus(`Error: ${e.message}`); setIsRunning(false) }
  }

  const inputStyle = { background: '#111e36', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 10px', fontSize: 12, width: '100%', boxSizing: 'border-box' }
  const labelStyle = { color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 4 }

  const sidebar = (
    <div style={{ width: isMobile ? '100%' : 300, background: C.sidebar, borderRight: isMobile ? 'none' : `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
      {/* Branding */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>FLOOD INTELLIGENCE</div>
        <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 800 }}>Run Analysis</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Jackson Lambda Model v2.0</div>
      </div>

      {/* Controls */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {/* Location */}
        <div>
          <label style={labelStyle}>LOCATION</label>
          <select value={location} onChange={e => setLocation(e.target.value)} style={inputStyle}>
            {(locations.length ? locations : ['jacksonville', 'miami', 'tampa', 'orlando', 'fort_lauderdale', 'sarasota', 'pensacola', 'gainesville', 'tallahassee', 'daytona_beach', 'fort_myers', 'key_west']).map(l => (
              <option key={l} value={l}>{l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>

        {/* Storm preset */}
        <div>
          <label style={labelStyle}>STORM EVENT</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(STORM_PRESETS).map(([key, p]) => (
              <button key={key} onClick={() => setStorm(key)} style={{ flex: 1, background: storm === key ? C.accent : 'transparent', color: storm === key ? '#0a1628' : C.accent, border: `1px solid ${C.accent}`, borderRadius: 4, padding: '6px 4px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {key === 'matthew' ? 'Matthew 16' : 'Irma 17'}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <label style={labelStyle}>DATE RANGE</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            <input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   style={inputStyle} />
          </div>
        </div>

        {/* API key */}
        <div>
          <label style={labelStyle}>API KEY</label>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} style={inputStyle} placeholder="sg_ent_demo" />
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={isRunning}
          style={{ background: isRunning ? '#1e3a5f' : C.accent, color: isRunning ? C.muted : '#0a1628', border: 'none', borderRadius: 4, padding: '11px', fontSize: 13, fontWeight: 800, cursor: isRunning ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}
        >
          {isRunning ? 'RUNNING PIPELINE...' : '▶  RUN ANALYSIS'}
        </button>
        {runStatus && (
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
            Status: <span style={{ color: runStatus.includes('Error') ? C.err : runStatus === 'complete' ? C.ok : C.warn, fontWeight: 600 }}>{runStatus}</span>
          </div>
        )}

        {/* Live result */}
        {runResult && (
          <div style={{ background: '#0a1628', border: `1px solid ${C.ok}33`, borderRadius: 6, padding: 14 }}>
            <div style={{ color: C.ok, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>RESULT</div>
            <div style={{ color: C.accent, fontSize: 26, fontWeight: 800, marginBottom: 2 }}>
              Λ = {(runResult.lambda_value ?? runResult.lambda_irma_2017)?.toFixed(4) ?? '—'}
            </div>
            <div style={{ color: (runResult.lambda_value ?? runResult.lambda_irma_2017) > 1 ? C.err : C.ok, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
              {(runResult.lambda_value ?? runResult.lambda_irma_2017) > 1 ? 'FLOODING' : 'RADIATIVE'}
            </div>
            {[['Surge Index', runResult.surge_index?.toFixed(3)], ['Surge Regime', runResult.surge_regime], ['FEMA High Risk', runResult.fema_high_risk != null ? (runResult.fema_high_risk ? 'YES' : 'NO') : null]].filter(([, v]) => v != null).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                <span style={{ color: C.muted }}>{k}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Live step metrics */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>TIME STEP — {cur.dt}</div>
          {[
            ['CSI',         cur.csi.toFixed(3),          cur.csi > 0.35 ? C.ok : '#e2e8f0'],
            ['POD',         cur.pod.toFixed(3),          cur.pod > 0.55 ? C.ok : '#e2e8f0'],
            ['FAR',         cur.far.toFixed(3),          cur.far < 0.55 ? C.ok : C.warn],
            ['Λ mean',      cur.lambdaMean.toFixed(4),   cur.lambdaMean > 0.15 ? C.warn : '#e2e8f0'],
            ['Soil',        `${soilSat.label} ${cur.soilPerm.toFixed(3)}`, soilSat.color],
            ['Stage (ft)',  cur.stage.toFixed(2),        cur.stage > 7 ? C.err : cur.stage > 4 ? C.warn : '#e2e8f0'],
            ['Precip (mm)', cur.precip.toFixed(1),       '#e2e8f0'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: C.muted, fontSize: 11 }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}` }}>
        <p style={{ color: C.border, fontSize: 10, textAlign: 'center', margin: 0 }}>Photonic Dynamics Inc. · JLM v2.0</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', position: 'relative', overflow: 'hidden' }}>
      {/* Sidebar — desktop always visible, mobile as overlay */}
      {!isMobile && sidebar}

      {/* Map + scrubber */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

          {/* Lambda legend */}
          <div style={{ position: 'absolute', bottom: 60, left: 12, background: 'rgba(10,22,40,0.92)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 10 }}>
            <div style={{ color: C.accent, fontWeight: 700, marginBottom: 4 }}>JLM Λ</div>
            {[['< 0.05 — Low', 'rgba(0,200,0,0.7)'], ['0.05–0.25 — Medium', 'rgba(255,200,0,0.7)'], ['> 0.25 — High', 'rgba(255,40,0,0.7)']].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <div style={{ width: 12, height: 8, background: c, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ color: '#cbd5e1' }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Mobile: open sidebar button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{ position: 'absolute', top: 12, left: 12, background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 6, color: C.accent, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', zIndex: 10 }}
            >
              {sidebarOpen ? '✕ Close' : '▶ Run Controls'}
            </button>
          )}
        </div>

        {/* Scrubber */}
        <div style={{ background: C.sidebar, borderTop: `1px solid ${C.border}`, padding: '10px 16px' }}>
          <input type="range" min={0} max={steps.length - 1} value={step} onChange={e => setStep(Number(e.target.value))} style={{ width: '100%', accentColor: C.accent, cursor: 'pointer', marginBottom: 6 }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
            {steps.map((s, i) => (
              <div key={i} onClick={() => setStep(i)} title={`${s.dt} · CSI ${s.csi.toFixed(3)}`} style={{ flex: 1, height: Math.max(3, Math.round((s.csi / maxCsi) * 32)), borderRadius: 2, cursor: 'pointer', background: i === step ? C.accent : i < step ? '#0e7490' : C.border, transition: 'background 0.1s' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>{sidebar}</div>
        </div>
      )}
    </div>
  )
}
