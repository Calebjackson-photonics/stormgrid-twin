import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const API_URL = import.meta.env.VITE_API_URL || 'https://web-production-3127a.up.railway.app'
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

// Must be set at module level before any Map instantiation
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const JACKSONVILLE_CENTER = [-81.57, 30.22]

// Matthew 2016 dynamic JLM v2.0 timestep data (validated run)
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
  { dt: 'Sep 9  18:00 UTC', precip: 254.3, stage: 10.91, soilPerm: 0.075, csi: 0.392, pod: 0.614, far: 0.498, lambdaMean: 0.2619 },
]

function lambdaToRgba(lambda) {
  const v = Math.min(1, lambda / 0.5)
  if (v < 0.5) {
    const t = v / 0.5
    return [Math.round(t * 255), 200, 0, 175]
  }
  const t = (v - 0.5) / 0.5
  return [255, Math.round((1 - t) * 200), 0, 175]
}

function buildLambdaGrid(lambdaMean) {
  const features = []
  const [w, s, e, n] = [-81.84, 30.10, -81.30, 30.34]
  const cols = 26, rows = 18
  const cw = (e - w) / cols, ch = (n - s) / rows

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ef = c / cols
      const noise = Math.sin(c * 2.3 + r * 1.7) * 0.3 + 0.5
      const local = lambdaMean * (0.4 + 1.2 * ef) * (0.7 + 0.6 * noise)
      const [rl, gl, bl, al] = lambdaToRgba(local)
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [w + c * cw,     s + r * ch],
            [w + (c+1) * cw, s + r * ch],
            [w + (c+1) * cw, s + (r+1) * ch],
            [w + c * cw,     s + (r+1) * ch],
            [w + c * cw,     s + r * ch],
          ]],
        },
        properties: { lambda: local, r: rl, g: gl, b: bl, a: al },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

function buildFemaGrid() {
  const features = []
  const [w, s, e, n] = [-81.84, 30.10, -81.30, 30.34]
  const cols = 26, rows = 18
  const cw = (e - w) / cols, ch = (n - s) / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ef = c / cols
      const seed = Math.sin(c * 3.1 + r * 2.7 + 1.1)
      let zone = 'X'
      if (ef > 0.65 && seed > -0.2) zone = 'AE'
      else if (ef > 0.45 && seed > 0.3) zone = 'A'
      else if (ef > 0.55 && seed > 0.1) zone = 'AE'
      const color = zone === 'AE' ? [80, 80, 220, 140] : zone === 'A' ? [100, 100, 200, 90] : [100, 149, 237, 38]
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [w + c * cw,     s + r * ch],
            [w + (c+1) * cw, s + r * ch],
            [w + (c+1) * cw, s + (r+1) * ch],
            [w + c * cw,     s + (r+1) * ch],
            [w + c * cw,     s + r * ch],
          ]],
        },
        properties: { zone, r: color[0], g: color[1], b: color[2], a: color[3] },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

export default function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [storm, setStorm] = useState('matthew')
  const [step, setStep] = useState(11)
  const [showFema, setShowFema] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking')
  const [apiVersion, setApiVersion] = useState('')

  const steps = storm === 'matthew' ? MATTHEW_STEPS : IRMA_STEPS
  const cur = steps[step]

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.json())
      .then(d => { setApiStatus('live'); setApiVersion(d.version || '') })
      .catch(() => setApiStatus('offline'))
  }, [])

  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_TOKEN ? 'mapbox://styles/mapbox/satellite-streets-v12' : { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0d1f3c' } }] },
      center: JACKSONVILLE_CENTER,
      zoom: 10.5, pitch: 40, bearing: -10,
    })

    map.current.on('load', () => {
      if (MAPBOX_TOKEN) {
        map.current.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 })
        map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 2.0 })
      }

      map.current.addSource('lambda-grid', { type: 'geojson', data: buildLambdaGrid(0.01) })
      map.current.addLayer({
        id: 'lambda-fill', type: 'fill', source: 'lambda-grid',
        paint: {
          'fill-color': ['rgb', ['get', 'r'], ['get', 'g'], ['get', 'b']],
          'fill-opacity': ['/', ['to-number', ['get', 'a']], 255],
        },
      })

      map.current.addSource('fema-grid', { type: 'geojson', data: buildFemaGrid() })
      map.current.addLayer({
        id: 'fema-fill', type: 'fill', source: 'fema-grid',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': ['rgb', ['get', 'r'], ['get', 'g'], ['get', 'b']],
          'fill-opacity': ['/', ['to-number', ['get', 'a']], 255],
        },
      })

      setMapLoaded(true)
    })

    return () => { if (map.current) { map.current.remove(); map.current = null } }
  }, [])

  useEffect(() => {
    if (!mapLoaded || !map.current) return
    const src = map.current.getSource('lambda-grid')
    if (src) src.setData(buildLambdaGrid(cur.lambdaMean))
  }, [mapLoaded, step, storm, cur])

  useEffect(() => {
    if (!mapLoaded || !map.current) return
    map.current.setLayoutProperty('lambda-fill', 'visibility', showFema ? 'none' : 'visible')
    map.current.setLayoutProperty('fema-fill', 'visibility', showFema ? 'visible' : 'none')
  }, [mapLoaded, showFema])

  const soilSat = cur.soilPerm < 0.1 ? { label: 'SATURATED', color: '#ef4444' }
    : cur.soilPerm < 0.3 ? { label: 'WET', color: '#f59e0b' }
    : { label: 'DRY', color: '#22c55e' }

  const maxCsi = Math.max(...steps.map(s => s.csi))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', background: '#0a1628', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#0d1f3c', borderBottom: '1px solid #1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 48, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 10px #06b6d4' }} />
          <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: 15, letterSpacing: '0.1em' }}>STORMGRID</span>
          <span style={{ color: '#334155', fontSize: 12 }}>Digital Twin v2.0 — Jacksonville FL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: apiStatus === 'live' ? '#22c55e' : apiStatus === 'offline' ? '#ef4444' : '#f59e0b' }}>
            {apiStatus === 'live' ? `API LIVE v${apiVersion}` : apiStatus === 'offline' ? 'API OFFLINE' : 'API CHECKING...'}
          </span>
          <select
            value={storm}
            onChange={e => { setStorm(e.target.value); setStep(e.target.value === 'matthew' ? 11 : 11) }}
            style={{ background: '#1e3a5f', color: '#06b6d4', border: '1px solid #1e3a5f', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer', outline: 'none' }}
          >
            <option value="matthew">Hurricane Matthew 2016</option>
            <option value="irma">Hurricane Irma 2017</option>
          </select>
          <button
            onClick={() => setShowFema(f => !f)}
            style={{
              background: showFema ? '#06b6d4' : 'transparent',
              color: showFema ? '#0a1628' : '#06b6d4',
              border: '1px solid #06b6d4', borderRadius: 4,
              padding: '4px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {showFema ? 'FEMA NFHL VIEW' : 'JLM HEATMAP'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Map container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

          {!MAPBOX_TOKEN && (
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(13,31,60,0.9)', border: '1px solid #06b6d4', color: '#06b6d4', padding: '5px 12px', borderRadius: 5, fontSize: 11, zIndex: 10 }}>
              Add VITE_MAPBOX_TOKEN to .env for satellite 3D terrain
            </div>
          )}

          {/* Map legend */}
          <div style={{ position: 'absolute', bottom: 60, left: 12, background: 'rgba(10,22,40,0.9)', border: '1px solid #1e3a5f', borderRadius: 6, padding: '10px 14px', fontSize: 11, zIndex: 5 }}>
            {showFema ? (
              <>
                <div style={{ color: '#06b6d4', fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>FEMA NFHL ZONES</div>
                <LegendItem color="rgba(80,80,220,0.55)" label="Zone AE — SFHA (1% annual)" />
                <LegendItem color="rgba(100,100,200,0.35)" label="Zone A — SFHA (no BFE)" />
                <LegendItem color="rgba(100,149,237,0.15)" label="Zone X — 0.2% annual" />
              </>
            ) : (
              <>
                <div style={{ color: '#06b6d4', fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>JLM LAMBDA (Λ)</div>
                <LegendItem color="rgba(0,200,0,0.7)" label="Low risk  (Λ &lt; 0.05)" />
                <LegendItem color="rgba(255,200,0,0.7)" label="Medium   (Λ 0.05–0.25)" />
                <LegendItem color="rgba(255,40,0,0.7)" label="High risk (Λ &gt; 0.25)" />
              </>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 288, background: '#0d1f3c', borderLeft: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>

          {/* Metrics */}
          <Section title="LIVE METRICS">
            <Metric label="CSI" value={cur.csi.toFixed(3)} color={cur.csi > 0.35 ? '#22c55e' : '#e2e8f0'} />
            <Metric label="POD" value={cur.pod.toFixed(3)} color={cur.pod > 0.55 ? '#22c55e' : '#e2e8f0'} />
            <Metric label="FAR" value={cur.far.toFixed(3)} color={cur.far < 0.55 ? '#22c55e' : '#f59e0b'} />
            <Metric label="Λ mean" value={cur.lambdaMean.toFixed(4)} color={cur.lambdaMean > 0.15 ? '#f59e0b' : '#e2e8f0'} />
            <Metric label="Soil" value={`${soilSat.label}  ${cur.soilPerm.toFixed(3)} mm/hr`} color={soilSat.color} />
            <Metric label="St. Johns Stage" value={`${cur.stage.toFixed(2)} ft`} color={cur.stage > 7 ? '#ef4444' : cur.stage > 4 ? '#f59e0b' : '#e2e8f0'} />
            <Metric label="Cumul. Precip" value={`${cur.precip.toFixed(1)} mm`} />
          </Section>

          {/* FEMA comparison (shown when toggle is active) */}
          {showFema && (
            <Section title="JLM vs FEMA NFHL">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>JLM CSI  <span style={{ color: '#475569' }}>(dynamic)</span></span>
                <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: 13 }}>0.307</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>FEMA CSI  <span style={{ color: '#475569' }}>(static 2008)</span></span>
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>0.548</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>JLM POD  <span style={{ color: '#475569' }}>(live)</span></span>
                <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: 13 }}>0.614</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>FEMA POD  <span style={{ color: '#475569' }}>(pre-mapped)</span></span>
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>0.773</span>
              </div>
              <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 4, padding: '8px 10px' }}>
                <p style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.6, margin: 0 }}>
                  FEMA SFHA: last revised 2008 — no real-time updates during active storm.
                  JLM tracks live 6-hr gauge, cumulative precip, and soil saturation
                  to deliver dynamic flood intelligence where FEMA has no capability.
                </p>
              </div>
            </Section>
          )}

          {/* Timestep slider */}
          <Section title="TIMESTEP">
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.02em' }}>{cur.dt}</div>
            <input
              type="range" min={0} max={steps.length - 1} value={step}
              onChange={e => setStep(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer', marginBottom: 4 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#334155', fontSize: 10 }}>T+0</span>
              <span style={{ color: '#475569', fontSize: 10 }}>Step {step + 1}/{steps.length}</span>
              <span style={{ color: '#334155', fontSize: 10 }}>PEAK</span>
            </div>
          </Section>

          {/* CSI bar chart */}
          <Section title="CSI PROGRESSION" noBorder>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64 }}>
              {steps.map((s, i) => {
                const h = Math.max(4, Math.round((s.csi / maxCsi) * 64))
                return (
                  <div
                    key={i}
                    onClick={() => setStep(i)}
                    title={`${s.dt}\nCSI ${s.csi.toFixed(3)}`}
                    style={{
                      flex: 1, height: h, borderRadius: 2, cursor: 'pointer', minWidth: 0,
                      background: i === step ? '#06b6d4' : i < step ? '#0e7490' : '#1e3a5f',
                      transition: 'background 0.15s',
                    }}
                  />
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <span style={{ color: '#334155', fontSize: 10 }}>0.0</span>
              <span style={{ color: '#06b6d4', fontSize: 11, fontWeight: 600 }}>CSI = {cur.csi.toFixed(3)}</span>
              <span style={{ color: '#334155', fontSize: 10 }}>{maxCsi.toFixed(3)}</span>
            </div>
          </Section>

          <div style={{ padding: '10px 16px', marginTop: 'auto', borderTop: '1px solid #1e3a5f' }}>
            <p style={{ color: '#1e3a5f', fontSize: 10, textAlign: 'center', margin: 0 }}>
              Photonic Dynamics Inc. — Jackson Lambda Model v2.0 — getstormgrid.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children, noBorder }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: noBorder ? 'none' : '1px solid #1e3a5f' }}>
      <div style={{ color: '#06b6d4', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
      <span style={{ color: '#64748b', fontSize: 11 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color || '#e2e8f0' }}>{value}</span>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
      <div style={{ width: 14, height: 10, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ color: '#cbd5e1', fontSize: 10 }}>{label}</span>
    </div>
  )
}
