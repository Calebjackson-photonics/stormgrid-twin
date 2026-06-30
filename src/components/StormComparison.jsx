import { useEffect, useRef, useState } from 'react'
import mapboxgl from '../lib/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { query } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

const TOKEN = mapboxgl.accessToken

const C = {
  bg: '#0a1628', card: '#0d1f3c', border: '#1e3a5f',
  accent: '#06b6d4', muted: '#64748b', ok: '#22c55e',
  warn: '#f59e0b', err: '#ef4444',
}

const JAX_CENTER = [-81.65, 30.33]
const JAX_BBOX   = [-81.84, 30.10, -81.30, 30.58]  // data / lookup bbox
// Image source bbox is padded so the hard boundary is always off-screen
const RASTER_BBOX = [-82.10, 29.88, -81.08, 30.82]

// Full 13-storm library
// lambda      = validated JLM scalar (shown in badges/delta)
// displayLambda = peak heatmap mean used for raster rendering
// soilPerm, precipMm, stageFt = peak-condition inputs for tap-to-inspect
const FULL_STORM_LIBRARY = [
  { id: 'matthew_2016',  label: 'Hurricane Matthew 2016',  lambda: 0.0401, displayLambda: 0.2541, soilPerm: 0.075, precipMm: 173.1, stageFt: 9.40,  regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'irma_2017',     label: 'Hurricane Irma 2017',     lambda: 0.0659, displayLambda: 0.2619, soilPerm: 0.075, precipMm: 254.3, stageFt: 10.91, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'harvey_2017',   label: 'Hurricane Harvey 2017',   lambda: 0.0823, displayLambda: 0.2800, soilPerm: 0.075, precipMm: 310.0, stageFt: 11.20, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'maria_2017',    label: 'Hurricane Maria 2017',    lambda: 0.0412, displayLambda: 0.1600, soilPerm: 0.150, precipMm: 112.0, stageFt: 5.80,  regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'michael_2018',  label: 'Hurricane Michael 2018',  lambda: 0.1758, displayLambda: 0.3200, soilPerm: 0.075, precipMm: 185.0, stageFt: 12.40, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'florence_2018', label: 'Hurricane Florence 2018', lambda: 0.0967, displayLambda: 0.2100, soilPerm: 0.075, precipMm: 228.0, stageFt: 8.60,  regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'dorian_2019',   label: 'Hurricane Dorian 2019',   lambda: 0.0934, displayLambda: 0.1900, soilPerm: 0.075, precipMm: 195.0, stageFt: 7.90,  regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'sally_2020',    label: 'Hurricane Sally 2020',    lambda: 0.1312, displayLambda: 0.2600, soilPerm: 0.075, precipMm: 265.0, stageFt: 10.30, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'ida_2021',      label: 'Hurricane Ida 2021',      lambda: 0.0847, displayLambda: 0.2200, soilPerm: 0.075, precipMm: 220.0, stageFt: 9.10,  regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'ian_2022',      label: 'Hurricane Ian 2022',      lambda: 0.3124, displayLambda: 0.3400, soilPerm: 0.075, precipMm: 380.0, stageFt: 13.80, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'nicole_2022',   label: 'Hurricane Nicole 2022',   lambda: 0.1543, displayLambda: 0.2900, soilPerm: 0.075, precipMm: 210.0, stageFt: 11.50, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'idalia_2023',   label: 'Hurricane Idalia 2023',   lambda: 0.0876, displayLambda: 0.2300, soilPerm: 0.075, precipMm: 198.0, stageFt: 8.90,  regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'debby_2024',    label: 'Hurricane Debby 2024',    lambda: 0.1421, displayLambda: 0.2700, soilPerm: 0.075, precipMm: 290.0, stageFt: 10.80, regime: 'RADIATIVE', bbox: JAX_BBOX },
]

// ── Spatial lambda math (identical to MapDashboard) ────────────────────────────
function lambdaAt(cx, cy, mean) {
  const t = (Math.sin(cx * 12.3 + cy * 9.1) * 0.5 + Math.cos(cx * 7.4 - cy * 15.2) * 0.5) * 0.5 + 0.5
  return Math.max(0, mean * (0.70 + 0.60 * t))
}

function computePeakLambda(lambdaMean) {
  const cols = 60, rows = 40
  let peak = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c / (cols - 1), cy = r / (rows - 1)
      const val = lambdaAt(cx, cy, lambdaMean)
      if (val > peak) peak = val
    }
  }
  return peak
}

// ── 256×256 canvas PNG — same color thresholds as MapDashboard + edge vignette ─
function buildRasterDataUrl(lambdaMean) {
  const W = 256, H = 256
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cx = x / (W - 1), cy = (H - 1 - y) / (H - 1)
      const local = lambdaAt(cx, cy, lambdaMean)
      let r, g, b
      if (local < 0.05) { r = 0; g = 210; b = 80 }
      else if (local < 0.15) { const t = (local - 0.05) / 0.10; r = Math.round(255 * t); g = Math.round(210 - 80 * t); b = 0 }
      else { const t = Math.min(1, (local - 0.15) / 0.20); r = 255; g = Math.round(130 - 130 * t); b = 0 }
      const alpha_v = Math.min(1, local / 0.30)
      // Edge vignette — fade 8% margin at each edge to hide hard bbox boundary
      const fade = Math.min(cx / 0.08, (1 - cx) / 0.08, cy / 0.08, (1 - cy) / 0.08, 1.0)
      const i = (y * W + x) * 4
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = Math.round((150 + alpha_v * 55) * fade)
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

function bboxToImageCoords(bbox) {
  const [w, s, e, n] = bbox
  return [[w, n], [e, n], [e, s], [w, s]]
}

function setRasterLayer(map, lambdaMean, bbox) {
  if (!map || lambdaMean == null) return
  const url = buildRasterDataUrl(lambdaMean)
  const coordinates = bboxToImageCoords(bbox)
  if (map.getSource('lambda-raster')) {
    map.getSource('lambda-raster').updateImage({ url, coordinates })
  } else {
    map.addSource('lambda-raster', { type: 'image', url, coordinates })
    try {
      map.addLayer({ id: 'lambda-fill', type: 'raster', source: 'lambda-raster', paint: { 'raster-resampling': 'linear', 'raster-opacity': 0.80 } }, 'water')
    } catch {
      map.addLayer({ id: 'lambda-fill', type: 'raster', source: 'lambda-raster', paint: { 'raster-resampling': 'linear', 'raster-opacity': 0.80 } })
    }
  }
}

// ── Click-to-inspect lookup grid (same as MapDashboard) ───────────────────────
function buildLookupGrid(lambdaMean, bbox) {
  const [w, s, e, n] = bbox
  const cols = 60, rows = 40
  const cw = (e - w) / cols, ch = (n - s) / rows
  const pts = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = cols > 1 ? c / (cols - 1) : 0
      const cy = rows > 1 ? r / (rows - 1) : 0
      pts.push({ lng: w + (c + 0.5) * cw, lat: s + (r + 0.5) * ch, lambda: lambdaAt(cx, cy, lambdaMean), cx, cy })
    }
  }
  return pts
}

// ── Derive inspection values from click point + storm metadata ─────────────────
function deriveInspection(clickPt, stormInfo) {
  const lambda     = clickPt?.lambda ?? 0
  const soilPerm   = stormInfo?.soilPerm  ?? 0.400
  const precipMm   = stormInfo?.precipMm  ?? 0
  const satPct     = Math.max(0, Math.round((0.605 - soilPerm) / (0.605 - 0.075) * 100))
  const precipIn   = (precipMm / 25.4).toFixed(2)

  let drainage = 'Normal'
  if (soilPerm < 0.1) drainage = 'Exceeded'
  else if (soilPerm < 0.3) drainage = 'Stressed'

  const elevFt      = (2 + (clickPt?.cy ?? 0.5) * 13).toFixed(1)
  const urbanFactor = (0.8 + (clickPt?.cx ?? 0.5) * 0.5).toFixed(2)

  // Risk — saturated soil / exceeded drainage cannot be Low
  let risk = 'LOW', riskColor = C.ok
  if (lambda > 0.15)      { risk = 'HIGH';   riskColor = C.err }
  else if (lambda > 0.05) { risk = 'MEDIUM'; riskColor = C.warn }
  if (risk === 'LOW' && (satPct >= 100 || drainage === 'Exceeded')) { risk = 'MEDIUM'; riskColor = C.warn }

  // Stage: scale peak stage by local lambda / displayLambda ratio
  const peakLambda = stormInfo?.displayLambda ?? stormInfo?.lambda ?? 0.10
  const peakStage  = stormInfo?.stageFt ?? null
  const stageFt    = peakStage ? (Math.min(lambda / Math.max(peakLambda, 0.01), 1.5) * peakStage).toFixed(2) : null

  const tti = risk === 'HIGH' ? (12 / (lambda / 0.08)).toFixed(1) : null
  return { lambda, satPct, precipIn, drainage, elevFt, urbanFactor, risk, riskColor, stageFt, tti }
}

// ── Inspection bottom sheet (tap-to-inspect, identical style to MapDashboard) ──
function CompInspectionSheet({ clickInfo, stormInfo, onClose }) {
  const d   = deriveInspection(clickInfo, stormInfo)
  const sep = { borderTop: `1px solid ${C.border}22`, margin: '10px 0' }
  const row = (label, value, color = '#e2e8f0') => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, gap: 8 }}>
      <span style={{ color: C.muted, fontSize: 11, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{value}</span>
    </div>
  )
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: '#0d1f3c', borderTop: `2px solid ${C.border}`,
      borderRadius: '16px 16px 0 0',
      padding: '8px 16px 32px',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.75)',
      maxHeight: '70vh', overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 14 }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, cursor: 'pointer' }} onClick={onClose} />
        <button onClick={onClose} style={{ position: 'absolute', right: 0, background: 'transparent', border: 'none', color: C.muted, fontSize: 18, cursor: 'pointer', padding: '2px 6px', lineHeight: 1, minHeight: 32, minWidth: 32 }}>✕</button>
      </div>
      <div style={{ color: C.muted, fontSize: 10, marginBottom: 6 }}>
        {Math.abs(clickInfo.lat).toFixed(4)}° {clickInfo.lat >= 0 ? 'N' : 'S'}&nbsp;&nbsp;
        {Math.abs(clickInfo.lng).toFixed(4)}° {clickInfo.lng >= 0 ? 'E' : 'W'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ background: d.riskColor + '22', border: `1px solid ${d.riskColor}`, borderRadius: 4, padding: '3px 10px', color: d.riskColor, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
          {d.risk} RISK
        </div>
        <div style={{ color: C.accent, fontSize: 20, fontWeight: 800 }}>Λ = {d.lambda.toFixed(4)}</div>
      </div>
      <div style={sep} />
      {row('Elevation', `${d.elevFt} ft`)}
      {row('Soil Saturation', `${d.satPct}%`, d.satPct > 80 ? C.err : d.satPct > 50 ? C.warn : C.ok)}
      {row('Rainfall Input', `${d.precipIn} in`)}
      {row('Drainage Capacity', d.drainage, d.drainage === 'Exceeded' ? C.err : d.drainage === 'Stressed' ? C.warn : C.ok)}
      {row('Urban Density Factor', `${d.urbanFactor}×`)}
      {d.stageFt && row('Gauge Stage', `${d.stageFt} ft`, Number(d.stageFt) > 7 ? C.err : Number(d.stageFt) > 4 ? C.warn : '#e2e8f0')}
      {d.tti && (
        <>
          <div style={sep} />
          {row('Est. Time to Inundation', `~${d.tti} hrs`, C.err)}
        </>
      )}
      {stormInfo?.label && (
        <div style={{ borderTop: `1px solid ${C.border}22`, marginTop: 12, paddingTop: 10 }}>
          <div style={{ color: C.muted, fontSize: 9, textAlign: 'center' }}>{stormInfo.label}</div>
        </div>
      )}
    </div>
  )
}

function exportCsvFromGrid(lambdaMean, label, bbox) {
  const [bw, bs, be, bn] = bbox
  const cols = 20, rows = 14
  const pts = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c / (cols - 1), cy = r / (rows - 1)
      pts.push({
        lng: (bw + (c + 0.5) * (be - bw) / cols).toFixed(5),
        lat: (bs + (r + 0.5) * (bn - bs) / rows).toFixed(5),
        lambda: lambdaAt(cx, cy, lambdaMean).toFixed(6),
        regime: lambdaAt(cx, cy, lambdaMean) >= 1 ? 'FLOODING' : 'RADIATIVE',
        storm: label,
      })
    }
  }
  const keys = Object.keys(pts[0])
  const csv = [keys.join(','), ...pts.map(p => keys.map(k => p[k]).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `stormgrid_${(label || 'data').replace(/\s+/g, '_').toLowerCase()}.csv`
  a.click()
}

export default function StormComparison() {
  const isMobile = useIsMobile()

  // Map DOM refs
  const elLeft  = useRef(null)
  const elRight = useRef(null)
  // Map instance refs
  const mapLeft  = useRef(null)
  const mapRight = useRef(null)
  // Sync mutex
  const syncing = useRef(false)
  // Click lookup grids (refs so click handlers always see current grid)
  const leftLookupRef  = useRef([])
  const rightLookupRef = useRef([])

  // DB data
  const [runs, setRuns] = useState([])

  // Map-loaded state
  const [leftLoaded,  setLeftLoaded]  = useState(false)
  const [rightLoaded, setRightLoaded] = useState(false)

  // Selection + lambda scalars
  const [leftSel,     setLeftSel]     = useState(FULL_STORM_LIBRARY[0].id)
  const [rightSel,    setRightSel]    = useState(FULL_STORM_LIBRARY[1].id)
  const [leftLambda,  setLeftLambda]  = useState(FULL_STORM_LIBRARY[0].displayLambda)
  const [rightLambda, setRightLambda] = useState(FULL_STORM_LIBRARY[1].displayLambda)
  const [leftInfo,    setLeftInfo]    = useState(FULL_STORM_LIBRARY[0])
  const [rightInfo,   setRightInfo]   = useState(FULL_STORM_LIBRARY[1])

  // Tap-to-inspect state (only one sheet open at a time)
  const [activeInspect, setActiveInspect] = useState(null) // { clickInfo, stormInfo }

  const [syncEnabled, setSyncEnabled] = useState(true)

  useEffect(() => {
    query('stormgrid_runs', { order: 'created_at', limit: 100 }).then(setRuns)
  }, [])

  // Init LEFT map — fitBounds to JAX_BBOX, click handler uses leftLookupRef
  useEffect(() => {
    if (!elLeft.current || mapLeft.current) return
    const [bw, bs, be, bn] = JAX_BBOX
    const m = new mapboxgl.Map({
      container: elLeft.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      bounds: [[bw, bs], [be, bn]],
      fitBoundsOptions: { padding: 16 },
      pitch: 0, bearing: 0,
      accessToken: TOKEN,
      attributionControl: false,
    })
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => setLeftLoaded(true))
    m.on('click', (e) => {
      const { lng, lat } = e.lngLat
      const grid = leftLookupRef.current
      if (!grid.length) return
      let closest = null, minDist = Infinity
      for (const p of grid) {
        const dist = Math.hypot(p.lng - lng, p.lat - lat)
        if (dist < minDist) { minDist = dist; closest = p }
      }
      if (closest && minDist < 0.14) {
        setActiveInspect({ clickInfo: { lng, lat, ...closest }, stormInfo: leftInfoRef.current })
      }
    })
    m.on('mouseenter', () => { m.getCanvas().style.cursor = 'crosshair' })
    m.on('mouseleave', () => { m.getCanvas().style.cursor = '' })
    mapLeft.current = m
    return () => { m.remove(); mapLeft.current = null; setLeftLoaded(false) }
  }, [])

  // Init RIGHT map
  useEffect(() => {
    if (!elRight.current || mapRight.current) return
    const [bw, bs, be, bn] = JAX_BBOX
    const m = new mapboxgl.Map({
      container: elRight.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      bounds: [[bw, bs], [be, bn]],
      fitBoundsOptions: { padding: 16 },
      pitch: 0, bearing: 0,
      accessToken: TOKEN,
      attributionControl: false,
    })
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => setRightLoaded(true))
    m.on('click', (e) => {
      const { lng, lat } = e.lngLat
      const grid = rightLookupRef.current
      if (!grid.length) return
      let closest = null, minDist = Infinity
      for (const p of grid) {
        const dist = Math.hypot(p.lng - lng, p.lat - lat)
        if (dist < minDist) { minDist = dist; closest = p }
      }
      if (closest && minDist < 0.14) {
        setActiveInspect({ clickInfo: { lng, lat, ...closest }, stormInfo: rightInfoRef.current })
      }
    })
    m.on('mouseenter', () => { m.getCanvas().style.cursor = 'crosshair' })
    m.on('mouseleave', () => { m.getCanvas().style.cursor = '' })
    mapRight.current = m
    return () => { m.remove(); mapRight.current = null; setRightLoaded(false) }
  }, [])

  // Update left raster + lookup grid when map loads or lambda changes
  useEffect(() => {
    if (!leftLoaded || !mapLeft.current) return
    setRasterLayer(mapLeft.current, leftLambda, RASTER_BBOX)
    leftLookupRef.current = buildLookupGrid(leftLambda, JAX_BBOX)
    setActiveInspect(null)
  }, [leftLoaded, leftLambda])

  // Update right raster + lookup grid
  useEffect(() => {
    if (!rightLoaded || !mapRight.current) return
    setRasterLayer(mapRight.current, rightLambda, RASTER_BBOX)
    rightLookupRef.current = buildLookupGrid(rightLambda, JAX_BBOX)
    setActiveInspect(null)
  }, [rightLoaded, rightLambda])

  // Sync zoom/pan
  useEffect(() => {
    const ml = mapLeft.current, mr = mapRight.current
    if (!leftLoaded || !rightLoaded || !ml || !mr) return
    function syncL() {
      if (syncing.current) return
      syncing.current = true
      mr.jumpTo({ center: ml.getCenter(), zoom: ml.getZoom(), bearing: ml.getBearing(), pitch: ml.getPitch() })
      syncing.current = false
    }
    function syncR() {
      if (syncing.current) return
      syncing.current = true
      ml.jumpTo({ center: mr.getCenter(), zoom: mr.getZoom(), bearing: mr.getBearing(), pitch: mr.getPitch() })
      syncing.current = false
    }
    if (syncEnabled) { ml.on('move', syncL); mr.on('move', syncR) }
    return () => { ml.off('move', syncL); mr.off('move', syncR) }
  }, [leftLoaded, rightLoaded, syncEnabled])

  // Keep click handlers' stormInfo current via a side-effect when info changes
  // (click handler closure captures leftInfo/rightInfo via setter; we store in a ref instead)
  const leftInfoRef  = useRef(leftInfo)
  const rightInfoRef = useRef(rightInfo)
  useEffect(() => { leftInfoRef.current  = leftInfo  }, [leftInfo])
  useEffect(() => { rightInfoRef.current = rightInfo }, [rightInfo])

  function resolveSelection(sel) {
    const preset = FULL_STORM_LIBRARY.find(p => p.id === sel)
    if (preset) return { lambdaMean: preset.displayLambda, info: preset }
    const run = runs.find(r => (r.run_id || r.id) === sel)
    if (!run) return null
    return {
      lambdaMean: run.lambda_value ? Math.max(run.lambda_value * 4, 0.08) : 0.08,
      info: { label: run.location || sel, lambda: run.lambda_value, regime: run.lambda_value < 1 ? 'RADIATIVE' : 'FLOODING' },
    }
  }

  useEffect(() => {
    const r = resolveSelection(leftSel)
    if (!r) return
    setLeftLambda(r.lambdaMean)
    setLeftInfo(r.info)
  }, [leftSel, runs])

  useEffect(() => {
    const r = resolveSelection(rightSel)
    if (!r) return
    setRightLambda(r.lambdaMean)
    setRightInfo(r.info)
  }, [rightSel, runs])

  const runOptions = runs.filter(r => r.status === 'complete')

  function StormSelect({ value, onChange }) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, minWidth: 140, background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}
      >
        <optgroup label="Storm Library">
          {FULL_STORM_LIBRARY.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </optgroup>
        {runOptions.length > 0 && (
          <optgroup label="Pipeline Runs">
            {runOptions.map(r => {
              const rid = r.run_id || r.id
              const loc = r.location ? ` — ${r.location}` : ''
              const dt  = r.created_at ? ` (${new Date(r.created_at).toLocaleDateString()})` : ''
              return <option key={rid} value={rid}>{rid?.slice(0, 16)}{loc}{dt}</option>
            })}
          </optgroup>
        )}
      </select>
    )
  }

  function InfoBadges({ info, peakLambda }) {
    if (!info) return null
    const displayVal = peakLambda ?? info.lambda
    const regime = displayVal != null ? (displayVal >= 1 ? 'COMPRESSION' : 'RADIATIVE') : info.regime
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {displayVal != null && (
          <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>Λ peak {Number(displayVal).toFixed(4)}</span>
        )}
        {regime && (
          <span style={{ background: (regime === 'COMPRESSION' ? C.err : C.ok) + '22', color: regime === 'COMPRESSION' ? C.err : C.ok, border: `1px solid ${(regime === 'COMPRESSION' ? C.err : C.ok)}44`, borderRadius: 3, fontSize: 9, fontWeight: 700, padding: '2px 5px' }}>
            {regime}
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Tap-to-inspect bottom sheet */}
      {activeInspect && (
        <CompInspectionSheet
          clickInfo={activeInspect.clickInfo}
          stormInfo={activeInspect.stormInfo}
          onClose={() => setActiveInspect(null)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Storm Comparison</h2>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Compare two storms side by side — tap any point to inspect</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.muted, fontSize: 12, userSelect: 'none' }}>
          <div
            onClick={() => setSyncEnabled(v => !v)}
            style={{ width: 36, height: 20, borderRadius: 10, background: syncEnabled ? C.accent : C.border, position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{ position: 'absolute', top: 2, left: syncEnabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </div>
          Sync zoom &amp; pan
        </label>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>LAMBDA SCALE</span>
        {[
          { label: 'LOW  Λ < 0.05',  color: 'rgba(0,210,80,0.85)' },
          { label: 'MED  0.05–0.15', color: 'rgba(255,165,0,0.85)' },
          { label: 'HIGH  Λ > 0.15', color: 'rgba(255,40,0,0.85)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color }} />
            <span style={{ color: C.muted, fontSize: 10 }}>{l.label}</span>
          </div>
        ))}
        <span style={{ color: C.muted, fontSize: 10, marginLeft: 'auto' }}>Λ ≥ 1 = FLOODING · Λ &lt; 1 = RADIATIVE</span>
      </div>

      {/* Dual maps */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
        {[
          { side: 'Left',  sel: leftSel,  setSel: setLeftSel,  elRef: elLeft,  lambdaMean: leftLambda,  info: leftInfo  },
          { side: 'Right', sel: rightSel, setSel: setRightSel, elRef: elRight, lambdaMean: rightLambda, info: rightInfo },
        ].map(({ side, sel, setSel, elRef, lambdaMean, info }) => (
          <div key={side} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{side.toUpperCase()}</span>
              <StormSelect value={sel} onChange={setSel} />
              <InfoBadges info={info} peakLambda={computePeakLambda(lambdaMean)} />
              <button
                onClick={() => exportCsvFromGrid(lambdaMean, info?.label || sel, JAX_BBOX)}
                style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 'auto' }}
              >
                Export CSV
              </button>
            </div>
            <div ref={elRef} style={{ width: '100%', height: isMobile ? 360 : 440 }} />
          </div>
        ))}
      </div>

      {/* Delta card */}
      {leftInfo?.lambda != null && rightInfo?.lambda != null && (
        <div style={{ marginTop: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 20px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>DELTA Λ</div>
            <div style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 800 }}>
              {Math.abs(Number(leftInfo.lambda) - Number(rightInfo.lambda)).toFixed(4)}
            </div>
          </div>
          <div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>LEFT — {leftInfo.label || leftSel}</div>
            <div style={{ color: C.accent, fontSize: 20, fontWeight: 800 }}>{Number(leftInfo.lambda).toFixed(4)}</div>
          </div>
          <div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>RIGHT — {rightInfo.label || rightSel}</div>
            <div style={{ color: C.accent, fontSize: 20, fontWeight: 800 }}>{Number(rightInfo.lambda).toFixed(4)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
