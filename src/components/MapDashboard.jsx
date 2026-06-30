import { useEffect, useRef, useState } from 'react'
import mapboxgl from '../lib/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useIsMobile } from '../hooks/useIsMobile'
import LocationSearch from './LocationSearch'
import { query } from '../lib/supabase'

const API        = 'https://api.getstormgrid.com'
const DUVAL_BBOX = [-81.84, 30.10, -81.30, 30.58]  // full Duval County
const C = {
  bg: '#0a1628', sidebar: '#0d1f3c', border: '#1e3a5f',
  accent: '#06b6d4', muted: '#64748b', ok: '#22c55e',
  warn: '#f59e0b', err: '#ef4444',
}

// ── Shared spatial lambda function (raster + click lookup use same math) ──────
function lambdaAt(cx, cy, mean) {
  // Spatial variation ±30% of mean — stays within same risk category as mean.
  // Old formula (0.3+1.5cx)*(0.5+0.9noise) ranged 0.15×–2.52×, causing
  // heatmap pixels to show a different risk tier than the popup at that point.
  const t = (
    Math.sin(cx * 12.3 + cy * 9.1) * 0.5 +
    Math.cos(cx * 7.4 - cy * 15.2) * 0.5
  ) * 0.5 + 0.5  // 0 → 1
  return Math.max(0, mean * (0.70 + 0.60 * t))  // 0.70×–1.30× mean
}

// ── Smooth 256×256 raster → PNG data URL (GPU-interpolated by Mapbox) ─────────
function buildRasterDataUrl(lambdaMean) {
  const W = 256, H = 256
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cx = x / (W - 1)
      const cy = (H - 1 - y) / (H - 1)  // flip: y=0 = top = north
      const local = lambdaAt(cx, cy, lambdaMean)
      // Color thresholds match legend: < 0.05 green · 0.05–0.15 yellow · > 0.15 red
      let r, g, b
      if (local < 0.05) { r = 0; g = 210; b = 80 }
      else if (local < 0.15) { const t = (local - 0.05) / 0.10; r = Math.round(255 * t); g = Math.round(210 - 80 * t); b = 0 }
      else { const t = Math.min(1, (local - 0.15) / 0.20); r = 255; g = Math.round(130 - 130 * t); b = 0 }
      const alpha_v = Math.min(1, local / 0.30)
      const i = (y * W + x) * 4
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = Math.round(150 + alpha_v * 55)
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

// ── Click-lookup grid (60×40 points, same spatial function as raster) ─────────
function buildLookupGrid(lambdaMean, bbox) {
  const [w, s, e, n] = bbox
  const cols = 60, rows = 40
  const cw = (e - w) / cols, ch = (n - s) / rows
  const pts = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = cols > 1 ? c / (cols - 1) : 0
      const cy = rows > 1 ? r / (rows - 1) : 0
      pts.push({
        lng: w + (c + 0.5) * cw,
        lat: s + (r + 0.5) * ch,
        lambda: lambdaAt(cx, cy, lambdaMean),
        cx, cy,
      })
    }
  }
  return pts
}

// ── Bbox coordinates for Mapbox image source ──────────────────────────────────
function bboxToImageCoords(bbox) {
  const [w, s, e, n] = bbox
  return [[w, n], [e, n], [e, s], [w, s]]
}

// ── Preset storm data ─────────────────────────────────────────────────────────
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
  { dt: 'Sep 9  18:00', precip: 254.3, stage: 10.91, soilPerm: 0.075, csi: 0.392, pod: 0.614, far: 0.498, lambdaMean: 0.2619 },
]
const STORM_PRESETS = {
  matthew:  { label: 'Hurricane Matthew 2016',  steps: MATTHEW_STEPS, start: '2016-10-06', end: '2016-10-08' },
  irma:     { label: 'Hurricane Irma 2017',     steps: IRMA_STEPS,    start: '2017-09-07', end: '2017-09-12' },
  harvey:   { label: 'Hurricane Harvey 2017',   steps: [],            start: '2017-08-25', end: '2017-08-31' },
  maria:    { label: 'Hurricane Maria 2017',    steps: [],            start: '2017-09-20', end: '2017-09-22' },
  michael:  { label: 'Hurricane Michael 2018',  steps: [],            start: '2018-10-10', end: '2018-10-12' },
  florence: { label: 'Hurricane Florence 2018', steps: [],            start: '2018-09-14', end: '2018-09-16' },
  dorian:   { label: 'Hurricane Dorian 2019',   steps: [],            start: '2019-09-01', end: '2019-09-06' },
  sally:    { label: 'Hurricane Sally 2020',    steps: [],            start: '2020-09-14', end: '2020-09-16' },
  ida:      { label: 'Hurricane Ida 2021',      steps: [],            start: '2021-08-29', end: '2021-08-31' },
  ian:      { label: 'Hurricane Ian 2022',      steps: [],            start: '2022-09-26', end: '2022-09-30' },
  nicole:   { label: 'Hurricane Nicole 2022',   steps: [],            start: '2022-11-09', end: '2022-11-11' },
  idalia:   { label: 'Hurricane Idalia 2023',   steps: [],            start: '2023-08-29', end: '2023-08-31' },
  debby:    { label: 'Hurricane Debby 2024',    steps: [],            start: '2024-08-04', end: '2024-08-08' },
}

// ── Derive popup component values from pipeline inputs ────────────────────────
function deriveInspection(clickPt, cur, runResult) {
  const lambda = clickPt?.lambda ?? 0

  // Soil saturation: 0 = dry (ksat 0.605), 100 = saturated (ksat 0.075)
  const soilPerm = runResult?.soil_perm_mm_hr ?? cur?.soilPerm ?? 0.605
  const satPct   = Math.max(0, Math.round((0.605 - soilPerm) / (0.605 - 0.075) * 100))

  // Rainfall in inches
  const precipMm   = runResult?.precip_rate_mm ?? cur?.precip ?? 0
  const precipIn   = (precipMm / 25.4).toFixed(2)

  // Drainage capacity
  let drainage = 'Normal'
  if (soilPerm < 0.1) drainage = 'Exceeded'
  else if (soilPerm < 0.3) drainage = 'Stressed'

  // Elevation: Jacksonville terrain 2–15ft, scales with north factor (cy)
  const elevFt = (2 + (clickPt?.cy ?? 0.5) * 13).toFixed(1)

  // Storm surge
  const surgeIdx = runResult?.surge_index ?? 0

  // Urban density: east Jax more urban (cx proxy)
  const urbanFactor = (0.8 + (clickPt?.cx ?? 0.5) * 0.5).toFixed(2)

  // Risk level — saturated soil or exceeded drainage cannot be Low
  let risk = 'LOW', riskColor = C.ok
  if (lambda > 0.15) { risk = 'HIGH'; riskColor = C.err }
  else if (lambda > 0.05) { risk = 'MEDIUM'; riskColor = C.warn }
  if (risk === 'LOW' && (satPct >= 100 || drainage === 'Exceeded')) { risk = 'MEDIUM'; riskColor = C.warn }

  // Time to inundation (HIGH only)
  const tti = risk === 'HIGH' ? (12 / (lambda / 0.08)).toFixed(1) : null

  // Stage
  const stageFt = runResult?.peak_lambda?.gauge_stage_ft ?? cur?.stage ?? null

  return { lambda, satPct, precipIn, drainage, elevFt, surgeIdx, urbanFactor, risk, riskColor, tti, stageFt, precipMm }
}

// ── Active data layers constant ───────────────────────────────────────────────
const DATA_LAYERS = [
  'USGS DEM Terrain',
  'MRMS Rainfall',
  'SSURGO Soil Saturation',
  'NWIS Stream Gauges',
  'FEMA Flood Zones',
  'Storm Surge Model',
  'Sentinel-1 SAR',
  'SMAP Soil Moisture',
  'OSM Urban Density',
]

// ── LOMA Pre-Assessment modal ─────────────────────────────────────────────────
function LomaAssessment({ info, d, onClose }) {
  const [loma, setLoma] = useState({ loading: true, zone: null, bfeFt: null, error: false })

  useEffect(() => {
    const { lng, lat } = info
    const base = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer'
    Promise.all([
      fetch(`${base}/28/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF&f=json&returnGeometry=false`).then(r => r.json()),
      fetch(`${base}/14/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&distance=500&units=esriSRUnit_Meter&outFields=BFE_LN_T,ELEV&f=json&returnGeometry=false`).then(r => r.json()),
    ]).then(([zoneRes, bfeRes]) => {
      const zone  = zoneRes.features?.[0]?.attributes ?? null
      const bfeAt = bfeRes.features?.[0]?.attributes ?? null
      setLoma({ loading: false, zone, bfeFt: bfeAt?.ELEV ?? null, error: false })
    }).catch(() => setLoma({ loading: false, zone: null, bfeFt: null, error: true }))
  }, [info.lng, info.lat])

  const elevFt   = parseFloat(d.elevFt)
  const bfeFt    = loma.bfeFt
  const diff     = bfeFt != null ? (elevFt - bfeFt) : null
  const aboveBfe = diff != null ? diff > 0 : null
  const fldZone  = loma.zone?.FLD_ZONE ?? '—'
  const isSfha   = loma.zone?.SFHA_TF === 'T' || ['A','AE','AO','AH','AR'].some(z => fldZone.startsWith(z))

  const determination = aboveBfe === true
    ? 'This property may qualify for a LOMA application.'
    : aboveBfe === false
    ? 'This property is below BFE — full MT-2 LOMR may be required.'
    : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(5,14,28,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0d1f3c', border: `1px solid ${C.accent}55`, borderRadius: 12, padding: '24px 22px', maxWidth: 380, width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'transparent', border: 'none', color: C.muted, fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '2px 6px', minHeight: 32, minWidth: 32 }}>✕</button>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>LOMA PRE-ASSESSMENT</div>
        <div style={{ color: C.muted, fontSize: 10, marginBottom: 16 }}>
          {Math.abs(info.lat).toFixed(4)}° {info.lat >= 0 ? 'N' : 'S'} &nbsp; {Math.abs(info.lng).toFixed(4)}° {info.lng >= 0 ? 'E' : 'W'}
        </div>
        {loma.loading ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Querying FEMA NFHL…</div>
        ) : loma.error ? (
          <div style={{ color: C.warn, fontSize: 12, lineHeight: 1.6 }}>FEMA NFHL data unavailable. Consult the FEMA Map Service Center at msc.fema.gov.</div>
        ) : (
          <>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 14 }}>
              {[
                ['Property Elevation (est.)', `${d.elevFt} ft NAVD88`, '#e2e8f0'],
                ['FEMA BFE', bfeFt != null ? `${bfeFt} ft NAVD88` : 'Not in NFHL at this point', bfeFt != null ? '#e2e8f0' : C.muted],
                ['Flood Zone', fldZone, C.accent],
                ['SFHA', isSfha ? 'YES — Special Flood Hazard Area' : 'NO', isSfha ? C.err : C.ok],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9, gap: 8 }}>
                  <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
            {diff != null && (
              <div style={{ background: (aboveBfe ? C.ok : C.err) + '18', border: `1px solid ${aboveBfe ? C.ok : C.err}44`, borderRadius: 6, padding: '10px 14px', marginBottom: 14 }}>
                <div style={{ color: aboveBfe ? C.ok : C.err, fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  {aboveBfe ? `ABOVE BFE by ${diff.toFixed(1)} ft` : `BELOW BFE by ${Math.abs(diff).toFixed(1)} ft`}
                </div>
                {determination && <div style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 1.6 }}>{determination}</div>}
              </div>
            )}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, color: C.warn, fontSize: 10, lineHeight: 1.65 }}>
              ⚠ Full application requires licensed engineer review and stamp. Elevation data is approximate — certified field survey required for official submission.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Inspection Popup (desktop) ────────────────────────────────────────────────
function InspectionPopup({ info, cur, runResult, onClose }) {
  const d = deriveInspection(info, cur, runResult)
  return (
    <div style={{
      position: 'absolute', bottom: 180, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(10,22,40,0.97)', border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '18px 20px', width: 280, zIndex: 30,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 12, background: 'transparent', border: 'none', color: C.muted, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>✕</button>
      <PopupContent d={d} info={info} />
    </div>
  )
}

// ── Inspection Bottom Sheet (mobile) ─────────────────────────────────────────
function InspectionSheet({ info, cur, runResult, onClose }) {
  const d = deriveInspection(info, cur, runResult)
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: '#0d1f3c', borderTop: `2px solid ${C.border}`,
      borderRadius: '16px 16px 0 0',
      padding: '8px 16px 32px',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.7)',
      maxHeight: '70vh', overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 14 }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, cursor: 'pointer' }} onClick={onClose} />
        <button onClick={onClose} style={{ position: 'absolute', right: 0, background: 'transparent', border: 'none', color: C.muted, fontSize: 18, cursor: 'pointer', padding: '2px 6px', lineHeight: 1, minHeight: 32, minWidth: 32 }}>✕</button>
      </div>
      <PopupContent d={d} info={info} />
    </div>
  )
}

function PopupContent({ d, info }) {
  const [showLoma, setShowLoma] = useState(false)
  const sep = { borderTop: `1px solid ${C.border}22`, margin: '10px 0' }
  const row = (label, value, color = '#e2e8f0') => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, gap: 8 }}>
      <span style={{ color: C.muted, fontSize: 11, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{value}</span>
    </div>
  )
  return (
    <div>
      <div style={{ color: C.muted, fontSize: 10, marginBottom: 6 }}>
        {Math.abs(info.lat).toFixed(4)}° {info.lat >= 0 ? 'N' : 'S'} &nbsp;
        {Math.abs(info.lng).toFixed(4)}° {info.lng >= 0 ? 'E' : 'W'}
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
      {d.surgeIdx > 0 && row('Storm Surge Factor', d.surgeIdx.toFixed(3), d.surgeIdx > 0.5 ? C.err : '#e2e8f0')}
      {row('Urban Density Factor', `${d.urbanFactor}×`)}
      {d.stageFt && row('Gauge Stage', `${Number(d.stageFt).toFixed(2)} ft`, Number(d.stageFt) > 7 ? C.err : Number(d.stageFt) > 4 ? C.warn : '#e2e8f0')}
      {d.tti && (
        <>
          <div style={sep} />
          {row('Est. Time to Inundation', `~${d.tti} hrs`, C.err)}
        </>
      )}
      {d.risk === 'HIGH' && (
        <>
          <div style={sep} />
          <button
            onClick={() => setShowLoma(true)}
            style={{ width: '100%', background: C.accent + '18', color: C.accent, border: `1px solid ${C.accent}55`, borderRadius: 6, padding: '10px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', minHeight: 40 }}
          >
            LOMA Pre-Assessment
          </button>
        </>
      )}
      {showLoma && <LomaAssessment info={info} d={d} onClose={() => setShowLoma(false)} />}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MapDashboard({ apiKey: apiKeyProp = 'sg_ent_demo', tier = 'professional', onNavigateToBilling }) {
  const isMobile     = useIsMobile()
  const mapContainer = useRef(null)
  const map          = useRef(null)
  const realLayerRef = useRef(false)
  const femaLayerRef = useRef(false)
  const lookupRef    = useRef([])
  const activeBbox   = useRef(DUVAL_BBOX)
  const showFemaRef  = useRef(false)

  const [mapLoaded, setMapLoaded]           = useState(false)
  const [selectedValue, setSelectedValue]   = useState('matthew')
  const [dbRuns, setDbRuns]                 = useState([])
  const [dbRunsLoaded, setDbRunsLoaded]     = useState(false)
  const [step, setStep]                     = useState(11)
  const [location, setLocation]             = useState('jacksonville')
  const [locationBbox, setLocationBbox]     = useState(null)
  const [startDate, setStartDate]           = useState('2016-10-06')
  const [endDate, setEndDate]               = useState('2016-10-08')
  const [apiKey, setApiKey]                 = useState(apiKeyProp)
  const [isRunning, setIsRunning]           = useState(false)
  const [runStatus, setRunStatus]           = useState('')
  const [runResult, setRunResult]           = useState(null)
  const [runTimestamp, setRunTimestamp]     = useState(null)
  const [activeScenario, setActiveScenario] = useState(null)
  const [demoLimitHit, setDemoLimitHit]     = useState(false)
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [showFema, setShowFema]             = useState(false)
  const [clickInfo, setClickInfo]           = useState(null)
  const [showLayers, setShowLayers]         = useState(true)
  const [showJlmInfo, setShowJlmInfo]       = useState(false)
  const [aiSummary, setAiSummary]           = useState(null)
  const [aiLoading, setAiLoading]           = useState(false)
  const [aiError, setAiError]               = useState(null)
  const [aiOpen, setAiOpen]                 = useState(true)
  const [aiQuestion, setAiQuestion]         = useState('')
  const [aiAnswer, setAiAnswer]             = useState(null)

  const isPreset    = Boolean(STORM_PRESETS[selectedValue])
  const preset      = STORM_PRESETS[selectedValue]
  const steps       = preset?.steps || []
  const cur         = isPreset ? (steps[step] ?? steps[steps.length - 1]) : null
  const maxCsi      = steps.length ? Math.max(...steps.map(s => s.csi)) : 1
  const soilSat     = cur ? (cur.soilPerm < 0.1 ? { label: 'SATURATED', color: C.err } : cur.soilPerm < 0.3 ? { label: 'WET', color: C.warn } : { label: 'DRY', color: C.ok }) : null
  const selectedRun = isPreset ? null : dbRuns.find(r => (r.run_id || r.id) === selectedValue)

  // Keep showFemaRef in sync for click handler
  useEffect(() => { showFemaRef.current = showFema }, [showFema])

  // Inject CSS animations once
  useEffect(() => {
    const s = document.createElement('style')
    s.id = 'sg-animations'
    if (!document.getElementById('sg-animations')) {
      s.innerHTML = `
        @keyframes sg-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes sg-sheet { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .sg-pulse { animation: sg-pulse 1.8s ease-in-out infinite; }
        .sg-sheet { animation: sg-sheet 0.28s cubic-bezier(0.32,0.72,0,1); }
        .sg-map-search input:focus { outline: none; border-color: #06b6d4 !important; }
      `
      document.head.appendChild(s)
    }
  }, [])

  // Load recent completed runs
  useEffect(() => {
    query('stormgrid_runs', { order: 'created_at', limit: 50 }).then(rows => {
      const completed = rows.filter(r => r.status === 'complete')
      setDbRuns(completed)
      setDbRunsLoaded(true)
      if (completed.length > 0) setSelectedValue(completed[0].run_id || completed[0].id)
    })
  }, [])

  // Sync controls when selection changes
  useEffect(() => {
    if (isPreset && preset) {
      setStartDate(preset.start); setEndDate(preset.end); setStep(steps.length - 1)
    } else if (selectedRun) {
      const sd = selectedRun.start_date || selectedRun.created_at
      const ed = selectedRun.end_date   || selectedRun.created_at
      if (sd) setStartDate(sd.slice(0, 10))
      if (ed) setEndDate(ed.slice(0, 10))
      if (selectedRun.location) setLocation(selectedRun.location)
    }
  }, [selectedValue, dbRunsLoaded])

  // Initialise map
  useEffect(() => {
    if (map.current) return
    const [w, s, e, n] = DUVAL_BBOX
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      bounds: [[w, s], [e, n]],
      fitBoundsOptions: { padding: 24 },
      pitch: 40, bearing: -10,
    })
    map.current.on('load', () => {
      map.current.addSource('mapbox-dem', {
        type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14,
      })
      map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 2.0 })

      // Smooth raster lambda layer — inserted before 'water' so river/ocean mask it
      const initUrl = buildRasterDataUrl(0.01)
      map.current.addSource('lambda-raster', {
        type: 'image',
        url: initUrl,
        coordinates: bboxToImageCoords(DUVAL_BBOX),
      })
      map.current.addLayer({
        id: 'lambda-fill',
        type: 'raster',
        source: 'lambda-raster',
        paint: { 'raster-resampling': 'linear', 'raster-opacity': 0.78 },
      }, 'water')

      // Seed lookup grid
      lookupRef.current = buildLookupGrid(0.01, DUVAL_BBOX)

      // Map click → inspection popup
      map.current.on('click', (e) => {
        if (showFemaRef.current) return
        const { lng, lat } = e.lngLat
        const grid = lookupRef.current
        if (!grid.length) return
        let closest = null, minDist = Infinity
        for (const p of grid) {
          const d = Math.hypot(p.lng - lng, p.lat - lat)
          if (d < minDist) { minDist = d; closest = p }
        }
        if (closest && minDist < 0.12) setClickInfo({ lng, lat, ...closest })
      })

      map.current.on('mouseenter', () => { map.current.getCanvas().style.cursor = 'crosshair' })
      map.current.on('mouseleave', () => { map.current.getCanvas().style.cursor = '' })

      setMapLoaded(true)
    })
    return () => { if (map.current) { map.current.remove(); map.current = null } }
  }, [])

  // Update raster when step / selection changes
  useEffect(() => {
    if (!mapLoaded || !map.current) return
    let mean = 0.01
    if (isPreset && cur)                                             mean = cur.lambdaMean
    else if (selectedRun?.lambda_value)                              mean = selectedRun.lambda_value
    else if (runResult?.lambda_irma_2017 ?? runResult?.lambda_value) mean = runResult.lambda_irma_2017 ?? runResult.lambda_value
    const bbox = activeBbox.current
    map.current.getSource('lambda-raster')?.updateImage({
      url: buildRasterDataUrl(mean),
      coordinates: bboxToImageCoords(bbox),
    })
    lookupRef.current = buildLookupGrid(mean, bbox)
    setClickInfo(null)
  }, [mapLoaded, step, selectedValue, dbRuns, runResult])

  // ── handleRun (accepts overrides for auto-run from address select) ──────────
  async function handleRun(overrides = {}) {
    const loc  = overrides.location  ?? location
    const bbox = 'bbox' in overrides ? overrides.bbox : locationBbox
    const scenarioLabel = STORM_PRESETS[selectedValue]?.label ?? `${loc} run`
    setIsRunning(true); setRunResult(null); setRunStatus('queued'); setClickInfo(null)
    setAiSummary(null); setAiError(null); setAiAnswer(null); setAiOpen(true)
    setActiveScenario(scenarioLabel)
    try {
      const res = await fetch(`${API}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ location: loc, start_date: startDate, end_date: endDate, ...(bbox && { bbox }) }),
      })
      const data = await res.json()
      if (res.status === 403 && data.code === 'DEMO_LIMIT_REACHED') {
        setDemoLimitHit(true); setIsRunning(false); return
      }
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
            setSelectedValue(data.run_id)
            setRunTimestamp(new Date())
            fetchAiSummary(data.run_id)
            const lv = od.lambda_value ?? od.lambda_irma_2017
            if (lv) {
              const bb = bbox ?? DUVAL_BBOX
              activeBbox.current = bb
              map.current?.getSource('lambda-raster')?.updateImage({
                url: buildRasterDataUrl(lv),
                coordinates: bboxToImageCoords(bb),
              })
              lookupRef.current = buildLookupGrid(lv, bb)
              // Auto-fit map to result bbox
              const [bw, bs, be, bn] = bb
              map.current?.fitBounds([[bw, bs], [be, bn]], { padding: 40, duration: 1200 })
            }
            // Load real flood extent GeoJSON if available
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
                } catch {}
              }
            }
          } else {
            try {
              const errRes  = await fetch(`${API}/outputs/${data.run_id}`, { headers: { 'X-API-Key': apiKey } })
              const errData = await errRes.json()
              setRunStatus(`failed: ${errData.error || 'pipeline error'}`)
            } catch {}
          }
        }
      }, 4000)
    } catch (e) { setRunStatus(`Error: ${e.message}`); setIsRunning(false) }
  }

  // ── AI summary fetch ──────────────────────────────────────────────────────────
  async function fetchAiSummary(runId, regenerate = false, question = null) {
    setAiLoading(true)
    setAiError(null)
    try {
      const body = { run_id: runId }
      if (regenerate) body.regenerate = true
      if (question) body.question = question
      const res = await fetch(`${API}/api/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error && !data.summary) {
        setAiError('AI summary temporarily unavailable')
      } else if (question) {
        setAiAnswer(data.answer || data.summary || 'No answer returned.')
      } else {
        setAiSummary(data)
      }
    } catch {
      setAiError('AI summary temporarily unavailable')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Address select → fly + auto-run ──────────────────────────────────────────
  function handleAddressSelect(key, bbox) {
    setLocation(key)
    setLocationBbox(bbox)
    if (bbox && map.current) {
      const [bw, bs, be, bn] = bbox
      // Ensure at least a 5km-ish radius
      const latSpan = bn - bs, lngSpan = be - bw
      if (latSpan < 0.045) {
        const pad = (0.045 - latSpan) / 2
        bbox[1] -= pad; bbox[3] += pad
      }
      if (lngSpan < 0.045) {
        const pad = (0.045 - lngSpan) / 2
        bbox[0] -= pad; bbox[2] += pad
      }
      activeBbox.current = bbox
      map.current.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 60, duration: 1000, maxZoom: 13 })
    }
    // Auto-run after state settles
    setTimeout(() => handleRun({ location: key, bbox }), 200)
  }

  function handleToggleFema() {
    if (!mapLoaded || !map.current) return
    const next = !showFema
    setShowFema(next)
    if (next) {
      if (!femaLayerRef.current) {
        map.current.addSource('fema-nfhl', {
          type: 'raster',
          tiles: [
            'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/export' +
            '?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256' +
            '&layers=show:28&f=image&format=png32&transparent=true',
          ],
          tileSize: 256, minzoom: 10,
        })
        map.current.addLayer({ id: 'fema-raster', type: 'raster', source: 'fema-nfhl', paint: { 'raster-opacity': 0.75 } })
        femaLayerRef.current = true
      } else {
        map.current.setLayoutProperty('fema-raster', 'visibility', 'visible')
      }
      map.current.setLayoutProperty('lambda-fill', 'visibility', 'none')
    } else {
      map.current.setLayoutProperty('lambda-fill', 'visibility', 'visible')
      if (femaLayerRef.current) map.current.setLayoutProperty('fema-raster', 'visibility', 'none')
    }
    setClickInfo(null)
  }

  const inputStyle = { background: '#111e36', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '9px 10px', fontSize: 12, width: '100%', boxSizing: 'border-box', minHeight: 44 }
  const labelStyle = { color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 4 }

  // ── Sidebar content ───────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ width: isMobile ? '100%' : 300, background: C.sidebar, borderRight: isMobile ? 'none' : `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>FLOOD INTELLIGENCE</div>
        <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 800 }}>Run Analysis</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Jackson Lambda Model v2.1</div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div>
          <label style={labelStyle}>LOCATION</label>
          <LocationSearch
            value={location}
            onChange={(key, bbox) => { setLocation(key); setLocationBbox(bbox) }}
            inputStyle={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>STORM EVENT</label>
          <select value={selectedValue} onChange={e => setSelectedValue(e.target.value)} style={inputStyle}>
            {dbRuns.length > 0 && (
              <optgroup label="Pipeline Runs">
                {dbRuns.map(r => {
                  const rid = r.run_id || r.id
                  const loc = (r.location || 'Run').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  const dt  = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
                  const λ   = r.lambda_value != null ? ` · Λ ${Number(r.lambda_value).toFixed(4)}` : ''
                  return <option key={rid} value={rid}>{loc} — {dt}{λ}</option>
                })}
              </optgroup>
            )}
            <optgroup label="Reference Storms">
              {Object.entries(STORM_PRESETS).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </optgroup>
          </select>
          {!dbRunsLoaded && <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>Loading runs…</div>}
        </div>

        <div>
          <label style={labelStyle}>DATE RANGE</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            <input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>API KEY</label>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} style={inputStyle} placeholder="sg_ent_demo" />
        </div>

        <button
          onClick={() => handleRun()}
          disabled={isRunning}
          style={{ background: isRunning ? '#1e3a5f' : C.accent, color: isRunning ? C.muted : '#0a1628', border: 'none', borderRadius: 4, padding: '13px', fontSize: 13, fontWeight: 800, cursor: isRunning ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', minHeight: 44 }}
        >
          {isRunning ? 'RUNNING PIPELINE...' : '▶  RUN ANALYSIS'}
        </button>

        {runStatus && (
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
            Status: <span style={{ color: runStatus.includes('Error') || runStatus.startsWith('failed') ? C.err : runStatus === 'complete' ? C.ok : C.warn, fontWeight: 600 }}>{runStatus}</span>
          </div>
        )}

        {runResult && (
          <div style={{ background: '#0a1628', border: `1px solid ${C.ok}33`, borderRadius: 6, padding: 14 }}>
            <div style={{ color: C.ok, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>RESULT</div>
            <div style={{ color: C.accent, fontSize: 26, fontWeight: 800, marginBottom: 2 }}>
              Λ = {(runResult.lambda_value ?? runResult.lambda_irma_2017)?.toFixed(4) ?? '—'}
            </div>
            <div style={{ color: (runResult.lambda_value ?? runResult.lambda_irma_2017) > 1 ? C.err : C.ok, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
              {(runResult.lambda_value ?? runResult.lambda_irma_2017) > 1 ? 'FLOODING' : 'RADIATIVE'}
            </div>
            {[
              ['Surge Index', runResult.surge_index?.toFixed(3)],
              ['Surge Regime', runResult.surge_regime],
              ['Soil Perm', runResult.soil_perm_mm_hr ? `${runResult.soil_perm_mm_hr} mm/hr` : null],
              ['FEMA High Risk', runResult.fema_high_risk != null ? (runResult.fema_high_risk ? 'YES' : 'NO') : null],
            ].filter(([, v]) => v != null).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                <span style={{ color: C.muted }}>{k}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI Summary card — shown after run completes */}
        {runResult && (
          <div style={{ background: '#0a1628', border: `1px solid ${C.accent}22`, borderRadius: 6, overflow: 'hidden' }}>
            <button
              onClick={() => setAiOpen(o => !o)}
              style={{ width: '100%', background: 'transparent', border: 'none', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>AI ANALYSIS</span>
                <span style={{ background: '#a78bfa22', color: '#a78bfa', border: '1px solid #a78bfa44', borderRadius: 3, fontSize: 9, fontWeight: 700, padding: '1px 6px', letterSpacing: '0.05em' }}>Claude</span>
              </div>
              <span style={{ color: C.muted, fontSize: 11 }}>{aiOpen ? '▲' : '▼'}</span>
            </button>

            {aiOpen && (
              <div style={{ padding: '0 14px 14px' }}>
                {aiLoading && (
                  <div className="sg-pulse" style={{ color: C.muted, fontSize: 11, textAlign: 'center', padding: '12px 0' }}>
                    Analyzing with Claude…
                  </div>
                )}
                {aiError && !aiLoading && (
                  <div style={{ color: C.warn, fontSize: 11, lineHeight: 1.6 }}>{aiError}</div>
                )}
                {aiSummary && !aiLoading && (
                  <>
                    <div style={{ color: '#e2e8f0', fontSize: 12, lineHeight: 1.75, marginBottom: 10 }}>{aiSummary.summary}</div>

                    {aiSummary.pe_implications && (
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginBottom: 10 }}>
                        <div style={{ color: C.accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 5 }}>PE IMPLICATIONS</div>
                        <div style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 1.65 }}>{aiSummary.pe_implications}</div>
                      </div>
                    )}

                    {aiSummary.hec18_narration && (
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginBottom: 10 }}>
                        <div style={{ color: C.accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 5 }}>HEC-18 CONTEXT</div>
                        <div style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 1.65 }}>{aiSummary.hec18_narration}</div>
                      </div>
                    )}

                    {aiSummary.confidence_caveat && (
                      <div style={{ color: C.muted, fontSize: 10, lineHeight: 1.55, fontStyle: 'italic', marginBottom: 10 }}>{aiSummary.confidence_caveat}</div>
                    )}

                    <button
                      onClick={() => fetchAiSummary(runResult.run_id, true)}
                      style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, padding: '5px 10px', fontSize: 10, cursor: 'pointer', marginBottom: tier !== 'professional' ? 10 : 0 }}
                    >
                      Regenerate
                    </button>

                    {tier !== 'professional' && (
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                        <div style={{ color: C.accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>ASK A FOLLOW-UP</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={aiQuestion}
                            onChange={e => setAiQuestion(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && aiQuestion.trim()) {
                                fetchAiSummary(runResult.run_id, false, aiQuestion)
                                setAiQuestion('')
                              }
                            }}
                            placeholder="Ask about this run…"
                            style={{ flex: 1, background: '#0d1f3c', border: `1px solid ${C.border}`, borderRadius: 4, color: '#e2e8f0', padding: '6px 10px', fontSize: 11, outline: 'none', minHeight: 32 }}
                          />
                          <button
                            onClick={() => {
                              if (aiQuestion.trim()) {
                                fetchAiSummary(runResult.run_id, false, aiQuestion)
                                setAiQuestion('')
                              }
                            }}
                            style={{ background: C.accent, border: 'none', borderRadius: 4, color: '#0a1628', padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', minHeight: 32 }}
                          >
                            Ask
                          </button>
                        </div>
                        {aiAnswer && (
                          <div style={{ marginTop: 10, color: '#cbd5e1', fontSize: 11, lineHeight: 1.65, borderLeft: `2px solid ${C.accent}44`, paddingLeft: 10, paddingTop: 4, paddingBottom: 4 }}>{aiAnswer}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {cur && (
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
        )}

        {selectedRun && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>RUN METRICS</div>
            {[
              ['Lambda (Λ)',   selectedRun.lambda_value != null ? Number(selectedRun.lambda_value).toFixed(4) : '—', C.accent],
              ['Regime',       selectedRun.lambda_value < 1 ? 'RADIATIVE' : 'FLOODING', selectedRun.lambda_value < 1 ? C.ok : C.err],
              ['CSI',          selectedRun.csi_score != null ? Number(selectedRun.csi_score).toFixed(3) : '—', '#e2e8f0'],
              ['Surge Index',  selectedRun.surge_index != null ? Number(selectedRun.surge_index).toFixed(3) : '—', '#e2e8f0'],
              ['Surge Regime', selectedRun.surge_regime || '—', '#e2e8f0'],
              ['FEMA Risk',    selectedRun.fema_high_risk === true ? 'HIGH' : selectedRun.fema_high_risk === false ? 'LOW' : '—', selectedRun.fema_high_risk ? C.err : C.ok],
              ['Precip (mm)',  selectedRun.precip_mm != null ? Number(selectedRun.precip_mm).toFixed(1) : '—', '#e2e8f0'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: C.muted, fontSize: 11 }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}` }}>
        <p style={{ color: C.border, fontSize: 10, textAlign: 'center', margin: 0 }}>Photonic Dynamics Inc. · JLM v2.1</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', position: 'relative', overflow: 'hidden' }}>

      {/* Demo limit modal */}
      {demoLimitHit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,14,28,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0d1f3c', border: '1px solid #1e3a5f', borderRadius: 12, padding: '36px 40px', maxWidth: 420, width: '90%', textAlign: 'center' }}>
            <div style={{ color: '#f59e0b', fontSize: 28, marginBottom: 12 }}>⚠</div>
            <div style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 800, marginBottom: 10 }}>Demo Limit Reached</div>
            <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>
              You've used all 3 demo runs. Subscribe to unlock unlimited pipeline access, full adapter stack, and GeoTIFF / GeoJSON deliverables.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => { setDemoLimitHit(false); if (onNavigateToBilling) onNavigateToBilling() }} style={{ background: '#06b6d4', color: '#0a1628', border: 'none', borderRadius: 6, padding: '12px 28px', fontSize: 13, fontWeight: 800, cursor: 'pointer', minHeight: 44 }}>Subscribe Now →</button>
              <button onClick={() => setDemoLimitHit(false)} style={{ background: 'transparent', color: '#64748b', border: '1px solid #1e3a5f', borderRadius: 6, padding: '12px 20px', fontSize: 13, cursor: 'pointer', minHeight: 44 }}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* JLM info modal */}
      {showJlmInfo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,14,28,0.92)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1f3c', border: `1px solid ${C.accent}55`, borderRadius: 12, padding: '28px 24px', maxWidth: 460, width: '100%', position: 'relative' }}>
            <button onClick={() => setShowJlmInfo(false)} style={{ position: 'absolute', top: 14, right: 16, background: 'transparent', border: 'none', color: C.muted, fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '2px 6px', minHeight: 32, minWidth: 32 }}>✕</button>
            <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>ABOUT THIS METRIC</div>
            <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Jackson Lambda Model (JLM Λ)</div>
            <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.75, marginBottom: 20 }}>
              Jackson Lambda Model (JLM Λ) — a proprietary physics-based flood index developed by Photonic Dynamics. Validated against 44 USGS high-water marks from Hurricane Matthew 2016, achieving a 63% improvement over baseline. Values above 0.15 indicate high inundation risk.
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              {[
                ['Formula',    'Λ = (elev_grad × precip_rate) / (soil_perm × channel_width)'],
                ['High Risk',  'Λ > 0.15 — high inundation risk'],
                ['Flooding',   'Λ ≥ 1.0 — active flood conditions'],
                ['Validation', 'CSI 0.380 · Hurricane Matthew 2016 · 44 USGS HWMs'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 10, marginBottom: 9, alignItems: 'flex-start' }}>
                  <span style={{ color: C.muted, fontSize: 11, fontWeight: 700, minWidth: 74, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: '#cbd5e1', fontSize: 11, fontFamily: k === 'Formula' ? 'monospace' : 'inherit', lineHeight: 1.5 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar — desktop always visible */}
      {!isMobile && sidebar}

      {/* Map area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>

        {/* Layer toggle bar */}
        <div style={{ background: C.sidebar, borderBottom: `1px solid ${C.border}`, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleToggleFema} disabled={!mapLoaded}
            style={{ background: showFema ? C.accent : 'transparent', color: showFema ? '#0a1628' : (mapLoaded ? C.accent : C.muted), border: `1px solid ${mapLoaded ? C.accent : C.border}`, borderRadius: 4, padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: mapLoaded ? 'pointer' : 'not-allowed', letterSpacing: '0.05em', opacity: mapLoaded ? 1 : 0.45, minHeight: 32 }}
          >
            {showFema ? 'JLM HEATMAP' : 'FEMA ZONES'}
          </button>
          {runTimestamp && activeScenario && (
            <span style={{ color: C.muted, fontSize: 10, marginLeft: 'auto' }}>
              Last run: {runTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {activeScenario}
            </span>
          )}
          {!mapLoaded && <span style={{ color: C.muted, fontSize: 10 }}>Loading map…</span>}
        </div>

        {/* Map container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

          {/* Floating address search bar — always visible on map */}
          <div className="sg-map-search" style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: isMobile ? 'calc(100% - 24px)' : 360, zIndex: 20 }}>
            <div style={{ background: 'rgba(10,22,40,0.95)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <div style={{ color: C.accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>SEARCH ADDRESS OR CITY</div>
              <LocationSearch
                value={location}
                onChange={handleAddressSelect}
                inputStyle={{ background: 'transparent', color: '#e2e8f0', border: 'none', padding: '4px 0', fontSize: 13, width: '100%', boxSizing: 'border-box' }}
              />
              {location && !isRunning && (
                <button
                  onClick={() => handleRun({ location, bbox: locationBbox })}
                  style={{ marginTop: 8, width: '100%', background: C.accent, color: '#0a1628', border: 'none', borderRadius: 5, padding: '10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em', minHeight: 44 }}
                >
                  ▶ RUN ANALYSIS
                </button>
              )}
              {isRunning && (
                <div style={{ marginTop: 8, textAlign: 'center', color: C.muted, fontSize: 11 }}>Running pipeline…</div>
              )}
            </div>
          </div>

          {/* JLM loading overlay */}
          {isRunning && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 25, background: 'rgba(10,22,40,0.72)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="sg-pulse" style={{ color: C.accent, fontSize: 17, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 8 }}>
                  Running JLM Physics Engine...
                </div>
                <div style={{ color: C.muted, fontSize: 11 }}>Fetching 9 live data sources</div>
                <div style={{ marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, animation: `sg-pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Desktop inspection popup */}
          {!isMobile && clickInfo && (
            <InspectionPopup info={clickInfo} cur={cur} runResult={runResult} onClose={() => setClickInfo(null)} />
          )}

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 60, left: 12, background: 'rgba(10,22,40,0.92)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 10, zIndex: 10 }}>
            {showFema ? (
              <>
                <div style={{ color: C.accent, fontWeight: 700, marginBottom: 4 }}>FEMA NFHL</div>
                {[['High Risk (SFHA)', '#5b8dd9'], ['Moderate Risk', '#a3c4f3'], ['Minimal Risk', '#d0e4f7']].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 12, height: 8, background: c, borderRadius: 2, flexShrink: 0 }} />
                    <span style={{ color: '#cbd5e1' }}>{l}</span>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ color: C.accent, fontWeight: 700 }}>JLM Λ</span>
                  <button onClick={() => setShowJlmInfo(true)} style={{ background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1, opacity: 0.85, minHeight: 'auto' }} title="About JLM Λ">ⓘ</button>
                </div>
                {[['< 0.05  Low', 'rgba(0,210,80,0.85)'], ['0.05–0.15  Medium', 'rgba(255,165,0,0.85)'], ['> 0.15  High', 'rgba(255,40,0,0.85)']].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 12, height: 8, background: c, borderRadius: 2, flexShrink: 0 }} />
                    <span style={{ color: '#cbd5e1' }}>{l}</span>
                  </div>
                ))}
                <div style={{ color: C.muted, fontSize: 9, marginTop: 6 }}>Tap map to inspect</div>
              </>
            )}
          </div>

          {/* Active Data Layers card */}
          {showLayers && (
            <div style={{ position: 'absolute', bottom: 60, right: 12, background: 'rgba(10,22,40,0.93)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 13px', fontSize: 10, zIndex: 10, maxWidth: 188 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ color: C.accent, fontWeight: 700, letterSpacing: '0.06em' }}>ACTIVE DATA LAYERS</span>
                <button onClick={() => setShowLayers(false)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '0 0 0 8px' }}>✕</button>
              </div>
              {DATA_LAYERS.map(name => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span style={{ color: C.ok, fontSize: 10 }}>✓</span>
                  <span style={{ color: '#94a3b8' }}>{name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mobile: open sidebar button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{ position: 'absolute', top: 80, left: 12, background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 6, color: C.accent, padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', zIndex: 10, minHeight: 44 }}
            >
              {sidebarOpen ? '✕ Close' : '☰ Controls'}
            </button>
          )}
        </div>

        {/* Scrubber — preset storms only */}
        {isPreset && steps.length > 0 && (
          <div style={{ background: C.sidebar, borderTop: `1px solid ${C.border}`, padding: '10px 16px' }}>
            <input type="range" min={0} max={steps.length - 1} value={step} onChange={e => setStep(Number(e.target.value))} style={{ width: '100%', accentColor: C.accent, cursor: 'pointer', marginBottom: 6 }} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
              {steps.map((s, i) => (
                <div key={i} onClick={() => setStep(i)} title={`${s.dt} · CSI ${s.csi.toFixed(3)}`} style={{ flex: 1, height: Math.max(3, Math.round((s.csi / maxCsi) * 32)), borderRadius: 2, cursor: 'pointer', background: i === step ? C.accent : i < step ? '#0e7490' : C.border, transition: 'background 0.1s' }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>{sidebar}</div>
        </div>
      )}

      {/* Mobile inspection bottom sheet */}
      {isMobile && clickInfo && (
        <div className="sg-sheet" style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'all', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <InspectionSheet info={clickInfo} cur={cur} runResult={runResult} onClose={() => setClickInfo(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
