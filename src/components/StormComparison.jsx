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
const JAX_BBOX   = [-81.84, 30.10, -81.30, 30.58]  // Duval County, matches MapDashboard

const FULL_STORM_LIBRARY = [
  { id: 'matthew_2016',  label: 'Hurricane Matthew 2016',   lambda: 0.0401, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'irma_2017',     label: 'Hurricane Irma 2017',      lambda: 0.0659, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'harvey_2017',   label: 'Hurricane Harvey 2017',    lambda: 0.0823, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'maria_2017',    label: 'Hurricane Maria 2017',     lambda: 0.0412, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'michael_2018',  label: 'Hurricane Michael 2018',   lambda: 0.1758, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'florence_2018', label: 'Hurricane Florence 2018',  lambda: 0.0967, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'dorian_2019',   label: 'Hurricane Dorian 2019',    lambda: 0.0934, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'sally_2020',    label: 'Hurricane Sally 2020',     lambda: 0.1312, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'ida_2021',      label: 'Hurricane Ida 2021',       lambda: 0.0847, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'ian_2022',      label: 'Hurricane Ian 2022',       lambda: 0.3124, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'nicole_2022',   label: 'Hurricane Nicole 2022',    lambda: 0.1543, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'idalia_2023',   label: 'Hurricane Idalia 2023',    lambda: 0.0876, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'debby_2024',    label: 'Hurricane Debby 2024',     lambda: 0.1421, regime: 'RADIATIVE', bbox: JAX_BBOX },
]

// ── Shared spatial lambda math (identical to MapDashboard) ────────────────────
function lambdaAt(cx, cy, mean) {
  const noise = (Math.sin(cx * 12.3 + cy * 9.1) * 0.5 + Math.cos(cx * 7.4 - cy * 15.2) * 0.5) * 0.5 + 0.5
  return Math.max(0, mean * (0.3 + 1.5 * cx) * (0.5 + 0.9 * noise))
}

// ── 256×256 canvas PNG raster (same color thresholds as MapDashboard) ─────────
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
      const i = (y * W + x) * 4
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = Math.round(150 + alpha_v * 55)
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

function bboxToImageCoords(bbox) {
  const [w, s, e, n] = bbox
  return [[w, n], [e, n], [e, s], [w, s]]
}

// ── Set or update raster layer on a Mapbox map instance ───────────────────────
function setRasterLayer(map, lambdaMean, bbox) {
  if (!map || lambdaMean == null) return
  const url = buildRasterDataUrl(lambdaMean)
  const coordinates = bboxToImageCoords(bbox)
  if (map.getSource('lambda-raster')) {
    map.getSource('lambda-raster').updateImage({ url, coordinates })
  } else {
    map.addSource('lambda-raster', { type: 'image', url, coordinates })
    map.addLayer({
      id: 'lambda-fill', type: 'raster', source: 'lambda-raster',
      paint: { 'raster-resampling': 'linear', 'raster-opacity': 0.78 },
    }, 'water')
  }
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

function exportCsv(geojson, label) {
  if (!geojson?.features?.length) return
  const rows = geojson.features.map(f => {
    const c = f.geometry.coordinates[0]
    return {
      lng: ((c[0][0] + c[2][0]) / 2).toFixed(6),
      lat: ((c[0][1] + c[2][1]) / 2).toFixed(6),
      lambda: Number(f.properties.lambda).toFixed(6),
      regime: f.properties.regime,
      storm: label,
    }
  })
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => r[k]).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `stormgrid_${label.replace(/\s+/g, '_').toLowerCase()}.csv`
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

  // DB data
  const [runs, setRuns]         = useState([])
  const [deliverables, setDels] = useState([])

  // Map-loaded state (useState so dependent effects re-run on load)
  const [leftLoaded,  setLeftLoaded]  = useState(false)
  const [rightLoaded, setRightLoaded] = useState(false)

  // Selection + lambda scalars
  const [leftSel,    setLeftSel]    = useState(FULL_STORM_LIBRARY[0].id)
  const [rightSel,   setRightSel]   = useState(FULL_STORM_LIBRARY[1].id)
  const [leftLambda, setLeftLambda] = useState(FULL_STORM_LIBRARY[0].lambda)
  const [rightLambda,setRightLambda]= useState(FULL_STORM_LIBRARY[1].lambda)
  const [leftInfo,   setLeftInfo]   = useState(FULL_STORM_LIBRARY[0])
  const [rightInfo,  setRightInfo]  = useState(FULL_STORM_LIBRARY[1])

  const [syncEnabled, setSyncEnabled] = useState(true)

  // Load DB data
  useEffect(() => {
    query('stormgrid_runs', { order: 'created_at', limit: 100 }).then(setRuns)
    query('deliverables',   { order: 'created_at', limit: 300 }).then(setDels)
  }, [])

  // Init LEFT map
  useEffect(() => {
    if (!elLeft.current || mapLeft.current) return
    const m = new mapboxgl.Map({
      container:   elLeft.current,
      style:       'mapbox://styles/mapbox/dark-v11',
      center:      JAX_CENTER,
      zoom:        10,
      pitch:       0,
      accessToken: TOKEN,
      attributionControl: false,
    })
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => setLeftLoaded(true))
    mapLeft.current = m
    return () => {
      m.remove()
      mapLeft.current = null
      setLeftLoaded(false)
    }
  }, [])

  // Init RIGHT map
  useEffect(() => {
    if (!elRight.current || mapRight.current) return
    const m = new mapboxgl.Map({
      container:   elRight.current,
      style:       'mapbox://styles/mapbox/dark-v11',
      center:      JAX_CENTER,
      zoom:        10,
      pitch:       0,
      accessToken: TOKEN,
      attributionControl: false,
    })
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => setRightLoaded(true))
    mapRight.current = m
    return () => {
      m.remove()
      mapRight.current = null
      setRightLoaded(false)
    }
  }, [])

  // Paint left raster whenever left map loads OR lambda changes
  useEffect(() => {
    if (leftLoaded && mapLeft.current) setRasterLayer(mapLeft.current, leftLambda, JAX_BBOX)
  }, [leftLoaded, leftLambda])

  // Paint right raster
  useEffect(() => {
    if (rightLoaded && mapRight.current) setRasterLayer(mapRight.current, rightLambda, JAX_BBOX)
  }, [rightLoaded, rightLambda])

  // Sync zoom/pan between maps
  useEffect(() => {
    const ml = mapLeft.current
    const mr = mapRight.current
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

    if (syncEnabled) {
      ml.on('move', syncL)
      mr.on('move', syncR)
    }
    return () => {
      ml.off('move', syncL)
      mr.off('move', syncR)
    }
  }, [leftLoaded, rightLoaded, syncEnabled])

  function resolveSelection(sel) {
    const preset = FULL_STORM_LIBRARY.find(p => p.id === sel)
    if (preset) return { lambdaMean: preset.lambda, info: preset }

    const run = runs.find(r => (r.run_id || r.id) === sel)
    if (!run) return null

    return {
      lambdaMean: run.lambda_value || 0.04,
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

  function InfoBadges({ info }) {
    if (!info) return null
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {info.lambda != null && (
          <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>Λ {Number(info.lambda).toFixed(4)}</span>
        )}
        {info.regime && (
          <span style={{ background: (info.regime === 'FLOODING' ? C.err : C.ok) + '22', color: info.regime === 'FLOODING' ? C.err : C.ok, border: `1px solid ${(info.regime === 'FLOODING' ? C.err : C.ok)}44`, borderRadius: 3, fontSize: 9, fontWeight: 700, padding: '2px 5px' }}>
            {info.regime}
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Storm Comparison</h2>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Compare two storms side by side — same Lambda color scale</p>
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
          { label: 'LOW  Λ < 0.05',  color: C.ok },
          { label: 'MED  0.05–0.15', color: C.warn },
          { label: 'HIGH  Λ > 0.15', color: C.err },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color, opacity: 0.8 }} />
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
            {/* Panel controls */}
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{side.toUpperCase()}</span>
              <StormSelect value={sel} onChange={setSel} />
              <InfoBadges info={info} />
              <button
                onClick={() => exportCsvFromGrid(lambdaMean, info?.label || info?.id || sel, JAX_BBOX)}
                style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 'auto' }}
              >
                Export CSV
              </button>
            </div>
            {/* Map container — explicit height required by Mapbox GL */}
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
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
              LEFT — {leftInfo.label || leftInfo.location || leftSel}
            </div>
            <div style={{ color: C.accent, fontSize: 20, fontWeight: 800 }}>{Number(leftInfo.lambda).toFixed(4)}</div>
          </div>
          <div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
              RIGHT — {rightInfo.label || rightInfo.location || rightSel}
            </div>
            <div style={{ color: C.accent, fontSize: 20, fontWeight: 800 }}>{Number(rightInfo.lambda).toFixed(4)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
