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
const JAX_BBOX   = [-82.0, 30.05, -81.3, 30.65]

const PRESETS = [
  { id: 'matthew_2016', label: 'Hurricane Matthew 2016', lambda: 0.0401, regime: 'RADIATIVE', bbox: JAX_BBOX },
  { id: 'irma_2017',   label: 'Hurricane Irma 2017',    lambda: 0.0659, regime: 'RADIATIVE', bbox: JAX_BBOX },
]

const LAMBDA_COLOR = λ => λ > 0.25 ? C.err : λ > 0.05 ? C.warn : C.ok

function buildPresetGrid(preset) {
  const [w, s, e, n] = preset.bbox
  const cols = 26, rows = 18
  const features = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = w + (c / cols) * (e - w)
      const x1 = w + ((c + 1) / cols) * (e - w)
      const y0 = s + (r / rows) * (n - s)
      const y1 = s + ((r + 1) / rows) * (n - s)
      const noise = Math.sin(c * 0.9 + r * 1.4) * 0.4 + Math.cos(c * 0.5 - r * 0.7) * 0.3
      const λ = Math.max(0.001, preset.lambda * (0.6 + (noise + 1) * 1.2))
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]] },
        properties: { lambda: λ, regime: λ >= 1 ? 'FLOODING' : 'RADIATIVE', color: LAMBDA_COLOR(λ) },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

function setLambdaData(map, geojson) {
  if (!map || !geojson) return
  if (map.getSource('lambda-grid')) {
    map.getSource('lambda-grid').setData(geojson)
    return
  }
  map.addSource('lambda-grid', { type: 'geojson', data: geojson })
  map.addLayer({
    id: 'lambda-fill', type: 'fill', source: 'lambda-grid',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.55 },
  })
  map.addLayer({
    id: 'lambda-outline', type: 'line', source: 'lambda-grid',
    paint: { 'line-color': '#ffffff', 'line-opacity': 0.06, 'line-width': 0.5 },
  })
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

  // Selection + geo data
  const [leftSel,  setLeftSel]  = useState(PRESETS[0].id)
  const [rightSel, setRightSel] = useState(PRESETS[1].id)
  const [leftGeo,  setLeftGeo]  = useState(() => buildPresetGrid(PRESETS[0]))
  const [rightGeo, setRightGeo] = useState(() => buildPresetGrid(PRESETS[1]))
  const [leftInfo,  setLeftInfo]  = useState(PRESETS[0])
  const [rightInfo, setRightInfo] = useState(PRESETS[1])

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

  // Paint left lambda layer whenever left map loads OR geo changes
  useEffect(() => {
    if (leftLoaded && mapLeft.current) setLambdaData(mapLeft.current, leftGeo)
  }, [leftLoaded, leftGeo])

  // Paint right lambda layer
  useEffect(() => {
    if (rightLoaded && mapRight.current) setLambdaData(mapRight.current, rightGeo)
  }, [rightLoaded, rightGeo])

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

  async function resolveSelection(sel) {
    const preset = PRESETS.find(p => p.id === sel)
    if (preset) return { geo: buildPresetGrid(preset), info: preset }

    const run = runs.find(r => (r.run_id || r.id) === sel)
    if (!run) return null

    const del = deliverables.find(d => d.run_id === sel && (d.file_type || '').toLowerCase().includes('geojson'))
    if (del?.storage_url) {
      try {
        const res = await fetch(del.storage_url)
        if (res.ok) {
          const geo = await res.json()
          if (geo?.features?.length) {
            geo.features.forEach(f => {
              const λ = f.properties.lambda ?? f.properties.lambda_value ?? 0
              f.properties.lambda = λ
              f.properties.color  = LAMBDA_COLOR(λ)
            })
            return {
              geo,
              info: { label: run.location || sel, lambda: run.lambda_value, regime: run.lambda_value < 1 ? 'RADIATIVE' : 'FLOODING' },
            }
          }
        }
      } catch {}
    }

    const synth = { ...PRESETS[0], lambda: run.lambda_value || 0.05 }
    return {
      geo:  buildPresetGrid(synth),
      info: { label: run.location || sel, lambda: run.lambda_value, regime: run.lambda_value < 1 ? 'RADIATIVE' : 'FLOODING' },
    }
  }

  useEffect(() => {
    resolveSelection(leftSel).then(r => {
      if (!r) return
      setLeftGeo(r.geo)
      setLeftInfo(r.info)
    })
  }, [leftSel, runs, deliverables])

  useEffect(() => {
    resolveSelection(rightSel).then(r => {
      if (!r) return
      setRightGeo(r.geo)
      setRightInfo(r.info)
    })
  }, [rightSel, runs, deliverables])

  const runOptions = runs.filter(r => r.status === 'complete')

  function StormSelect({ value, onChange, side }) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, minWidth: 140, background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}
      >
        <optgroup label="Preset Storms">
          {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
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
          { label: 'MED  0.05–0.25', color: C.warn },
          { label: 'HIGH  Λ > 0.25', color: C.err },
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
          { side: 'Left',  sel: leftSel,  setSel: setLeftSel,  elRef: elLeft,  geo: leftGeo,  info: leftInfo  },
          { side: 'Right', sel: rightSel, setSel: setRightSel, elRef: elRight, geo: rightGeo, info: rightInfo },
        ].map(({ side, sel, setSel, elRef, geo, info }) => (
          <div key={side} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            {/* Panel controls */}
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{side.toUpperCase()}</span>
              <StormSelect value={sel} onChange={setSel} side={side} />
              <InfoBadges info={info} />
              <button
                onClick={() => exportCsv(geo, info?.label || info?.id || sel)}
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
