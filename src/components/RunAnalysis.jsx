import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const API = 'https://api.getstormgrid.com'
const C = { card: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' }

const HURRICANES = [
  { name: 'Hurricane Matthew 2016',  start: '2016-10-06', end: '2016-10-08' },
  { name: 'Hurricane Irma 2017',     start: '2017-09-10', end: '2017-09-12' },
  { name: 'Hurricane Harvey 2017',   start: '2017-08-25', end: '2017-08-31' },
  { name: 'Hurricane Maria 2017',    start: '2017-09-20', end: '2017-09-22' },
  { name: 'Hurricane Michael 2018',  start: '2018-10-10', end: '2018-10-12' },
  { name: 'Hurricane Florence 2018', start: '2018-09-14', end: '2018-09-16' },
  { name: 'Hurricane Dorian 2019',   start: '2019-09-01', end: '2019-09-06' },
  { name: 'Hurricane Sally 2020',    start: '2020-09-14', end: '2020-09-16' },
  { name: 'Hurricane Ida 2021',      start: '2021-08-29', end: '2021-08-31' },
  { name: 'Hurricane Ian 2022',      start: '2022-09-26', end: '2022-09-30' },
  { name: 'Hurricane Nicole 2022',   start: '2022-11-09', end: '2022-11-11' },
  { name: 'Hurricane Idalia 2023',   start: '2023-08-29', end: '2023-08-31' },
  { name: 'Hurricane Debby 2024',    start: '2024-08-04', end: '2024-08-08' },
]

const MAPBOX_TOKEN = 'pk.eyJ1IjoiamFja2NpMyIsImEiOiJjbXB2YmZt' +
  'YTQwMTRuMnJxMXdubW55b3BsIn0.xHTNNNnD6-0ogHLjK-lKMQ'
mapboxgl.accessToken = MAPBOX_TOKEN

const MATTHEW_STEPS = [
  { dt: 'Oct 6  00:00 UTC', precip: 0.0,   stage: 1.41, soilPerm: 0.605, csi: 0.178, pod: 0.295, far: 0.721, lambdaMean: 0.0082 },
  { dt: 'Oct 6  06:00 UTC', precip: 0.3,   stage: 1.52, soilPerm: 0.605, csi: 0.185, pod: 0.318, far: 0.708, lambdaMean: 0.0095 },
  { dt: 'Oct 6  12:00 UTC', precip: 1.1,   stage: 1.89, soilPerm: 0.605, csi: 0.198, pod: 0.341, far: 0.695, lambdaMean: 0.0112 },
  { dt: 'Oct 6  18:00 UTC', precip: 2.8,   stage: 2.45, soilPerm: 0.605, csi: 0.219, pod: 0.364, far: 0.674, lambdaMean: 0.0138 },
  { dt: 'Oct 7  00:00 UTC', precip: 6.2,   stage: 2.61, soilPerm: 0.605, csi: 0.228, pod: 0.375, far: 0.660, lambdaMean: 0.0167 },
  { dt: 'Oct 7  06:00 UTC', precip: 12.3,  stage: 2.72, soilPerm: 0.605, csi: 0.236, pod: 0.386, far: 0.646, lambdaMean: 0.0201 },
  { dt: 'Oct 7  12:00 UTC', precip: 38.3,  stage: 2.47, soilPerm: 0.075, csi: 0.219, pod: 0.364, far: 0.671, lambdaMean: 0.0347 },
  { dt: 'Oct 7  18:00 UTC', precip: 93.3,  stage: 4.38, soilPerm: 0.075, csi: 0.324, pod: 0.523, far: 0.591, lambdaMean: 0.0892 },
  { dt: 'Oct 8  00:00 UTC', precip: 168.3, stage: 6.16, soilPerm: 0.075, csi: 0.362, pod: 0.568, far: 0.538, lambdaMean: 0.1647 },
  { dt: 'Oct 8  06:00 UTC', precip: 170.1, stage: 7.82, soilPerm: 0.075, csi: 0.371, pod: 0.591, far: 0.520, lambdaMean: 0.2103 },
  { dt: 'Oct 8  12:00 UTC', precip: 172.0, stage: 8.61, soilPerm: 0.075, csi: 0.375, pod: 0.602, far: 0.511, lambdaMean: 0.2318 },
  { dt: 'Oct 8  18:00 UTC', precip: 173.1, stage: 9.40, soilPerm: 0.075, csi: 0.380, pod: 0.614, far: 0.500, lambdaMean: 0.2541 },
]
const IRMA_STEPS = [
  { dt: 'Sep 7  00:00 UTC', precip: 0.0,   stage: 1.20, soilPerm: 0.605, csi: 0.162, pod: 0.271, far: 0.748, lambdaMean: 0.0063 },
  { dt: 'Sep 7  06:00 UTC', precip: 0.8,   stage: 1.38, soilPerm: 0.605, csi: 0.174, pod: 0.295, far: 0.729, lambdaMean: 0.0079 },
  { dt: 'Sep 7  12:00 UTC', precip: 3.2,   stage: 1.67, soilPerm: 0.605, csi: 0.189, pod: 0.318, far: 0.710, lambdaMean: 0.0101 },
  { dt: 'Sep 7  18:00 UTC', precip: 8.1,   stage: 2.05, soilPerm: 0.605, csi: 0.207, pod: 0.341, far: 0.688, lambdaMean: 0.0134 },
  { dt: 'Sep 8  00:00 UTC', precip: 19.4,  stage: 2.34, soilPerm: 0.605, csi: 0.224, pod: 0.364, far: 0.665, lambdaMean: 0.0178 },
  { dt: 'Sep 8  06:00 UTC', precip: 42.7,  stage: 2.51, soilPerm: 0.075, csi: 0.241, pod: 0.386, far: 0.641, lambdaMean: 0.0289 },
  { dt: 'Sep 8  12:00 UTC', precip: 87.3,  stage: 3.12, soilPerm: 0.075, csi: 0.271, pod: 0.432, far: 0.614, lambdaMean: 0.0521 },
  { dt: 'Sep 8  18:00 UTC', precip: 143.2, stage: 4.87, soilPerm: 0.075, csi: 0.312, pod: 0.500, far: 0.577, lambdaMean: 0.0947 },
  { dt: 'Sep 9  00:00 UTC', precip: 198.6, stage: 6.43, soilPerm: 0.075, csi: 0.348, pod: 0.545, far: 0.542, lambdaMean: 0.1513 },
  { dt: 'Sep 9  06:00 UTC', precip: 231.4, stage: 8.21, soilPerm: 0.075, csi: 0.367, pod: 0.579, far: 0.524, lambdaMean: 0.2048 },
  { dt: 'Sep 9  12:00 UTC', precip: 248.7, stage: 9.76, soilPerm: 0.075, csi: 0.381, pod: 0.602, far: 0.509, lambdaMean: 0.2364 },
  { dt: 'Sep 9  18:00 UTC', precip: 254.3, stage: 10.91,soilPerm: 0.075, csi: 0.392, pod: 0.614, far: 0.498, lambdaMean: 0.2619 },
]

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

export default function RunAnalysis() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [storm, setStorm] = useState('matthew')
  const [step, setStep] = useState(11)
  const [showFema, setShowFema] = useState(false)
  const [runId, setRunId] = useState('')
  const [runStatus, setRunStatus] = useState('')
  const [runResult, setRunResult] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [apiKey, setApiKey] = useState('sg_ent_demo')
  const [location, setLocation] = useState('jacksonville')
  const [locations, setLocations] = useState([])

  // storm selector for run form
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [stormSearch, setStormSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [startDate, setStartDate] = useState(HURRICANES[0].start)
  const [endDate, setEndDate] = useState(HURRICANES[0].end)
  const dropdownRef = useRef(null)

  const isCustom = selectedIdx === -1
  const filtered = HURRICANES.filter(h => h.name.toLowerCase().includes(stormSearch.toLowerCase()))

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
        setStormSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function pickHurricane(idx) {
    setSelectedIdx(idx)
    setStartDate(HURRICANES[idx].start)
    setEndDate(HURRICANES[idx].end)
    setDropdownOpen(false)
    setStormSearch('')
  }

  function pickCustom() {
    setSelectedIdx(-1)
    setDropdownOpen(false)
    setStormSearch('')
  }

  const steps = storm === 'matthew' ? MATTHEW_STEPS : IRMA_STEPS
  const cur = steps[step]
  const maxCsi = Math.max(...steps.map(s => s.csi))
  const soilSat = cur.soilPerm < 0.1 ? { label: 'SATURATED', color: C.err } : cur.soilPerm < 0.3 ? { label: 'WET', color: C.warn } : { label: 'DRY', color: C.ok }

  useEffect(() => {
    fetch(`${API}/locations`).then(r => r.json()).then(d => setLocations(Object.keys(d.locations || {}))).catch(() => {})
  }, [])

  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({ container: mapContainer.current, style: 'mapbox://styles/mapbox/streets-v12', center: [-81.65, 30.33], zoom: 11, pitch: 40, bearing: -10 })
    map.current.on('load', () => {
      if (MAPBOX_TOKEN) { map.current.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 }); map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 2.0 }) }
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
      const res = await fetch(`${API}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey }, body: JSON.stringify({ location, start_date: startDate, end_date: endDate }) })
      const data = await res.json()
      if (!res.ok) { setRunStatus(`Error: ${data.error || res.status}`); setIsRunning(false); return }
      setRunId(data.run_id); setRunStatus('running')
      const poll = setInterval(async () => {
        const s = await fetch(`${API}/status/${data.run_id}`, { headers: { 'X-API-Key': apiKey } })
        const sd = await s.json()
        setRunStatus(sd.status)
        if (sd.status === 'complete' || sd.status === 'failed') {
          clearInterval(poll); setIsRunning(false)
          if (sd.status === 'complete') {
            const out = await fetch(`${API}/outputs/${data.run_id}`, { headers: { 'X-API-Key': apiKey } })
            setRunResult(await out.json())
          }
        }
      }, 4000)
    } catch (e) { setRunStatus(`Error: ${e.message}`); setIsRunning(false) }
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>
      {/* Left: map */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <select value={storm} onChange={e => { setStorm(e.target.value); setStep(11) }} style={{ background: '#1e3a5f', color: C.accent, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
            <option value="matthew">Hurricane Matthew 2016</option>
            <option value="irma">Hurricane Irma 2017</option>
          </select>
          <button onClick={() => setShowFema(f => !f)} style={{ background: showFema ? C.accent : 'transparent', color: showFema ? '#0a1628' : C.accent, border: `1px solid ${C.accent}`, borderRadius: 4, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {showFema ? 'FEMA VIEW' : 'JLM HEATMAP'}
          </button>
          <span style={{ color: C.muted, fontSize: 11 }}>Step {step + 1}/{steps.length} · {cur.dt}</span>
        </div>
        <div style={{ flex: 1, position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          <div style={{ position: 'absolute', bottom: 48, left: 12, background: 'rgba(10,22,40,0.9)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 10 }}>
            <div style={{ color: C.accent, fontWeight: 700, marginBottom: 4 }}>JLM Λ</div>
            {[['Low (< 0.05)', 'rgba(0,200,0,0.7)'], ['Medium (0.05–0.25)', 'rgba(255,200,0,0.7)'], ['High (> 0.25)', 'rgba(255,40,0,0.7)']].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <div style={{ width: 12, height: 8, background: c, borderRadius: 2 }} />
                <span style={{ color: '#cbd5e1' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px', marginTop: 8 }}>
          <input type="range" min={0} max={steps.length - 1} value={step} onChange={e => setStep(Number(e.target.value))} style={{ width: '100%', accentColor: C.accent, cursor: 'pointer' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40, marginTop: 6 }}>
            {steps.map((s, i) => (
              <div key={i} onClick={() => setStep(i)} title={`CSI ${s.csi.toFixed(3)}`} style={{ flex: 1, height: Math.max(3, Math.round((s.csi / maxCsi) * 40)), borderRadius: 2, cursor: 'pointer', background: i === step ? C.accent : i < step ? '#0e7490' : C.border, transition: 'background 0.1s' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right: metrics + run form */}
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, overflowY: 'auto' }}>
        {/* Live metrics */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>LIVE METRICS</div>
          {[
            ['CSI', cur.csi.toFixed(3), cur.csi > 0.35 ? C.ok : '#e2e8f0'],
            ['POD', cur.pod.toFixed(3), cur.pod > 0.55 ? C.ok : '#e2e8f0'],
            ['FAR', cur.far.toFixed(3), cur.far < 0.55 ? C.ok : C.warn],
            ['Λ mean', cur.lambdaMean.toFixed(4), cur.lambdaMean > 0.15 ? C.warn : '#e2e8f0'],
            ['Soil', `${soilSat.label}  ${cur.soilPerm.toFixed(3)}`, soilSat.color],
            ['St. Johns Stage', `${cur.stage.toFixed(2)} ft`, cur.stage > 7 ? C.err : cur.stage > 4 ? C.warn : '#e2e8f0'],
            ['Cumul. Precip', `${cur.precip.toFixed(1)} mm`, '#e2e8f0'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ color: C.muted, fontSize: 11 }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: color || '#e2e8f0' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Run new analysis */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>RUN NEW ANALYSIS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Searchable storm selector */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  value={dropdownOpen ? stormSearch : (isCustom ? (customName || 'Custom Storm') : HURRICANES[selectedIdx].name)}
                  onChange={e => { setStormSearch(e.target.value); setDropdownOpen(true) }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search storms…"
                  style={{ width: '100%', boxSizing: 'border-box', background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${dropdownOpen ? C.accent : C.border}`, borderRadius: 4, padding: '6px 28px 6px 8px', fontSize: 11, outline: 'none' }}
                />
                <span
                  onClick={() => { setDropdownOpen(o => !o); setStormSearch('') }}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 9, cursor: 'pointer', userSelect: 'none' }}
                >
                  {dropdownOpen ? '▲' : '▼'}
                </span>
              </div>

              {dropdownOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#0d1f3c', border: `1px solid ${C.accent}`, borderRadius: 4, zIndex: 300, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                  {filtered.length === 0 && (
                    <div style={{ padding: '8px 10px', color: C.muted, fontSize: 11 }}>No matches</div>
                  )}
                  {filtered.map(h => {
                    const idx = HURRICANES.indexOf(h)
                    const active = selectedIdx === idx
                    return (
                      <div
                        key={h.name}
                        onMouseDown={() => pickHurricane(idx)}
                        style={{ padding: '8px 10px', cursor: 'pointer', background: active ? C.accent + '18' : 'transparent', borderBottom: `1px solid ${C.border}33` }}
                      >
                        <div style={{ color: active ? C.accent : '#e2e8f0', fontSize: 11, fontWeight: active ? 700 : 400 }}>{h.name}</div>
                        <div style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>{h.start} → {h.end}</div>
                      </div>
                    )
                  })}
                  <div
                    onMouseDown={pickCustom}
                    style={{ padding: '8px 10px', cursor: 'pointer', borderTop: `1px solid ${C.border}`, background: isCustom ? C.accent + '18' : 'transparent' }}
                  >
                    <div style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>+ Custom Storm</div>
                    <div style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Enter any storm name and date range</div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom storm fields */}
            {isCustom && (
              <input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Storm name (e.g. Hurricane Rosa 2018)"
                style={{ background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px 8px', fontSize: 11, outline: 'none' }}
              />
            )}

            {/* Date range — editable in custom mode, read-only badge in preset mode */}
            {isCustom ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 6px', fontSize: 10, outline: 'none' }} />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 6px', fontSize: 10, outline: 'none' }} />
              </div>
            ) : (
              <div style={{ background: '#0a1628', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 8px', fontSize: 10, color: C.muted, display: 'flex', justifyContent: 'space-between' }}>
                <span>{startDate}</span>
                <span style={{ color: C.border }}>→</span>
                <span>{endDate}</span>
              </div>
            )}

            <select value={location} onChange={e => setLocation(e.target.value)} style={{ background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px 8px', fontSize: 11 }}>
              {(locations.length ? locations : ['jacksonville', 'miami', 'tampa', 'orlando', 'fort_lauderdale', 'sarasota', 'pensacola']).map(l => (
                <option key={l} value={l}>{l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" style={{ background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px 8px', fontSize: 11 }} />
            <button onClick={handleRun} disabled={isRunning} style={{ background: isRunning ? '#1e3a5f' : C.accent, color: isRunning ? C.muted : '#0a1628', border: 'none', borderRadius: 4, padding: '8px', fontSize: 12, fontWeight: 700, cursor: isRunning ? 'not-allowed' : 'pointer' }}>
              {isRunning ? 'RUNNING...' : 'RUN ANALYSIS'}
            </button>
            {runStatus && <div style={{ fontSize: 10, color: C.muted, padding: '4px 0' }}>Status: <span style={{ color: runStatus.includes('Error') ? C.err : runStatus === 'complete' ? C.ok : C.warn }}>{runStatus}</span></div>}
          </div>
        </div>

        {runResult && (
          <div style={{ background: C.card, border: `1px solid ${C.ok}44`, borderRadius: 8, padding: 16 }}>
            <div style={{ color: C.ok, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>RESULT</div>
            {[['Lambda', runResult.lambda_value?.toFixed(4)], ['Surge Index', runResult.surge_index?.toFixed(3)], ['FEMA High Risk', runResult.fema_high_risk ? 'Yes' : 'No'], ['Regime', runResult.surge_regime]].map(([k, v]) => v !== undefined && (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
                <span style={{ color: C.muted }}>{k}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{v ?? '—'}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px', marginTop: 'auto' }}>
          <p style={{ color: '#1e3a5f', fontSize: 10, textAlign: 'center', margin: 0 }}>Photonic Dynamics Inc. — JLM v2.0 — getstormgrid.com</p>
        </div>
      </div>
    </div>
  )
}
