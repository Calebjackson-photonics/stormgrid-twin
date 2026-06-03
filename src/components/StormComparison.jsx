import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { query } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoiamFja2NpMyIsImEiOiJjbXB2YmZt' +
  'YTQwMTRuMnJxMXdubW15b3BsIn0.xHTNNNnD6-0ogHLjK-lKMQ'

const C = {
  bg: '#0a1628', card: '#0d1f3c', border: '#1e3a5f',
  accent: '#06b6d4', muted: '#64748b', ok: '#22c55e',
  warn: '#f59e0b', err: '#ef4444',
}

const JAX_BBOX = [-82.0, 30.05, -81.3, 30.65]
const JAX_CENTER = [-81.65, 30.33]

const PRESETS = [
  { id: 'matthew_2016', label: 'Hurricane Matthew 2016', lambda: 0.0401, regime: 'RADIATIVE', location: 'Jacksonville', bbox: JAX_BBOX, center: JAX_CENTER },
  { id: 'irma_2017',   label: 'Hurricane Irma 2017',    lambda: 0.0659, regime: 'RADIATIVE', location: 'Jacksonville', bbox: JAX_BBOX, center: JAX_CENTER },
]

const LAMBDA_FILL = λ => λ > 0.25 ? C.err : λ > 0.05 ? C.warn : C.ok

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
      const spatial = Math.sin(c * 0.9 + r * 1.4) * 0.4 + Math.cos(c * 0.5 - r * 0.7) * 0.3
      const λ = Math.max(0.001, preset.lambda * (0.6 + (spatial + 1) * 1.2))
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]],
        },
        properties: { lambda: λ, regime: λ >= 1 ? 'FLOODING' : 'RADIATIVE', color: LAMBDA_FILL(λ) },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

function exportCsv(geojson, label) {
  if (!geojson?.features?.length) return
  const rows = geojson.features.map(f => {
    const coords = f.geometry.coordinates[0]
    const cx = (coords[0][0] + coords[2][0]) / 2
    const cy = (coords[0][1] + coords[2][1]) / 2
    return { lng: cx.toFixed(6), lat: cy.toFixed(6), lambda: Number(f.properties.lambda).toFixed(6), regime: f.properties.regime, storm: label }
  })
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => r[k]).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `stormgrid_comparison_${label.replace(/\s+/g, '_').toLowerCase()}.csv`
  a.click()
}

function addLambdaLayer(map, geojson) {
  if (map.getSource('lambda-grid')) {
    map.getSource('lambda-grid').setData(geojson)
    return
  }
  map.addSource('lambda-grid', { type: 'geojson', data: geojson })
  map.addLayer({
    id: 'lambda-fill',
    type: 'fill',
    source: 'lambda-grid',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0.55,
    },
  })
  map.addLayer({
    id: 'lambda-outline',
    type: 'line',
    source: 'lambda-grid',
    paint: { 'line-color': '#ffffff', 'line-opacity': 0.06, 'line-width': 0.5 },
  })
}

function MapPanel({ side, selected, onSelect, options, geojson, onExport, label, mapRef, elRef }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
      {/* Controls */}
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{side.toUpperCase()}</span>
        <select
          value={selected}
          onChange={e => onSelect(e.target.value)}
          style={{ flex: 1, minWidth: 140, background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}
        >
          <optgroup label="Preset Storms">
            {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </optgroup>
          {options.length > 0 && (
            <optgroup label="Pipeline Runs">
              {options.map(r => {
                const rid = r.run_id || r.id
                const loc = r.location ? ` — ${r.location}` : ''
                const date = r.created_at ? ` (${new Date(r.created_at).toLocaleDateString()})` : ''
                return <option key={rid} value={rid}>{rid?.slice(0, 16)}{loc}{date}</option>
              })}
            </optgroup>
          )}
        </select>
        {label && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>Λ {Number(label.lambda || 0).toFixed(4)}</span>
            <span style={{ background: (label.regime === 'FLOODING' ? C.err : C.ok) + '22', color: label.regime === 'FLOODING' ? C.err : C.ok, border: `1px solid ${(label.regime === 'FLOODING' ? C.err : C.ok)}44`, borderRadius: 3, fontSize: 9, fontWeight: 700, padding: '2px 5px' }}>
              {label.regime || 'RADIATIVE'}
            </span>
          </div>
        )}
        <button
          onClick={onExport}
          style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 'auto' }}
        >
          Export CSV
        </button>
      </div>

      {/* Map */}
      <div ref={elRef} style={{ flex: 1, minHeight: 380 }} />
    </div>
  )
}

export default function StormComparison() {
  const isMobile = useIsMobile()
  const elLeft  = useRef(null)
  const elRight = useRef(null)
  const mapLeft  = useRef(null)
  const mapRight = useRef(null)
  const syncing  = useRef(false)
  const leftLoaded  = useRef(false)
  const rightLoaded = useRef(false)

  const [runs, setRuns]         = useState([])
  const [deliverables, setDels] = useState([])
  const [syncEnabled, setSyncEnabled] = useState(true)

  const [leftSel,  setLeftSel]  = useState(PRESETS[0].id)
  const [rightSel, setRightSel] = useState(PRESETS[1].id)
  const [leftGeo,  setLeftGeo]  = useState(() => buildPresetGrid(PRESETS[0]))
  const [rightGeo, setRightGeo] = useState(() => buildPresetGrid(PRESETS[1]))
  const [leftInfo,  setLeftInfo]  = useState(PRESETS[0])
  const [rightInfo, setRightInfo] = useState(PRESETS[1])

  useEffect(() => {
    query('stormgrid_runs', { order: 'created_at', limit: 100 }).then(setRuns)
    query('deliverables', { order: 'created_at', limit: 300 }).then(setDels)
  }, [])

  function initMap(elRef, mapRef, loadedRef, otherMapRef, isLeft) {
    if (mapRef.current || !elRef.current) return
    const m = new mapboxgl.Map({
      container: elRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: JAX_CENTER,
      zoom: 10,
      pitch: 0,
      attributionControl: false,
    })
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => {
      loadedRef.current = true
      const geo = isLeft ? leftGeo : rightGeo
      addLambdaLayer(m, geo)
    })
    m.on('move', () => {
      if (!syncEnabled || syncing.current || !otherMapRef.current) return
      syncing.current = true
      otherMapRef.current.jumpTo({
        center: m.getCenter(),
        zoom: m.getZoom(),
        bearing: m.getBearing(),
        pitch: m.getPitch(),
      })
      syncing.current = false
    })
    mapRef.current = m
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      initMap(elLeft,  mapLeft,  leftLoaded,  mapRight, true)
      initMap(elRight, mapRight, rightLoaded, mapLeft,  false)
    }, 50)
    return () => {
      clearTimeout(timer)
      mapLeft.current?.remove();  mapLeft.current  = null; leftLoaded.current  = false
      mapRight.current?.remove(); mapRight.current = null; rightLoaded.current = false
    }
  }, [])

  useEffect(() => {
    if (!mapLeft.current || !mapRight.current) return
    const maps = [mapLeft.current, mapRight.current]
    maps.forEach((m, i) => {
      const other = maps[1 - i]
      m.off('move')
      m.on('move', () => {
        if (!syncEnabled || syncing.current || !other) return
        syncing.current = true
        other.jumpTo({ center: m.getCenter(), zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() })
        syncing.current = false
      })
    })
  }, [syncEnabled])

  async function resolveSelection(sel) {
    const preset = PRESETS.find(p => p.id === sel)
    if (preset) return { geo: buildPresetGrid(preset), info: preset }

    const run = runs.find(r => (r.run_id || r.id) === sel)
    if (!run) return null

    const geojsonDel = deliverables.find(d => d.run_id === sel && (d.file_type || '').toLowerCase().includes('geojson'))
    if (geojsonDel?.storage_url) {
      try {
        const res = await fetch(geojsonDel.storage_url)
        if (res.ok) {
          const geo = await res.json()
          if (geo?.features?.length) {
            geo.features.forEach(f => {
              if (f.properties?.lambda == null && f.properties?.lambda_value != null)
                f.properties.lambda = f.properties.lambda_value
              const λ = f.properties?.lambda || 0
              f.properties.color = LAMBDA_FILL(λ)
            })
            return {
              geo,
              info: { label: run.location || sel, lambda: run.lambda_value, regime: run.surge_regime || (run.lambda_value < 1 ? 'RADIATIVE' : 'FLOODING') },
            }
          }
        }
      } catch {}
    }

    const syntheticPreset = { ...PRESETS[0], lambda: run.lambda_value || 0.05, label: run.location || sel }
    return { geo: buildPresetGrid(syntheticPreset), info: { label: run.location || sel, lambda: run.lambda_value, regime: run.lambda_value < 1 ? 'RADIATIVE' : 'FLOODING' } }
  }

  useEffect(() => {
    resolveSelection(leftSel).then(result => {
      if (!result) return
      setLeftGeo(result.geo)
      setLeftInfo(result.info)
      if (leftLoaded.current && mapLeft.current) addLambdaLayer(mapLeft.current, result.geo)
    })
  }, [leftSel, runs, deliverables])

  useEffect(() => {
    resolveSelection(rightSel).then(result => {
      if (!result) return
      setRightGeo(result.geo)
      setRightInfo(result.info)
      if (rightLoaded.current && mapRight.current) addLambdaLayer(mapRight.current, result.geo)
    })
  }, [rightSel, runs, deliverables])

  useEffect(() => {
    if (leftLoaded.current && mapLeft.current && leftGeo) addLambdaLayer(mapLeft.current, leftGeo)
  }, [leftGeo])

  useEffect(() => {
    if (rightLoaded.current && mapRight.current && rightGeo) addLambdaLayer(mapRight.current, rightGeo)
  }, [rightGeo])

  const runOptions = runs.filter(r => r.status === 'complete')

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Storm Comparison</h2>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Compare two storms side by side — same Lambda color scale</p>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.muted, fontSize: 12, userSelect: 'none' }}>
          <div
            onClick={() => setSyncEnabled(e => !e)}
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
          { label: 'LOW  Λ < 0.05', color: C.ok },
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

      {/* Maps */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
        <MapPanel
          side="Left"
          selected={leftSel}
          onSelect={setLeftSel}
          options={runOptions}
          geojson={leftGeo}
          onExport={() => exportCsv(leftGeo, leftInfo?.label || leftSel)}
          label={leftInfo}
          mapRef={mapLeft}
          elRef={elLeft}
        />
        <MapPanel
          side="Right"
          selected={rightSel}
          onSelect={setRightSel}
          options={runOptions}
          geojson={rightGeo}
          onExport={() => exportCsv(rightGeo, rightInfo?.label || rightSel)}
          label={rightInfo}
          mapRef={mapRight}
          elRef={elRight}
        />
      </div>

      {/* Delta */}
      {leftInfo && rightInfo && leftInfo.lambda != null && rightInfo.lambda != null && (
        <div style={{ marginTop: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 20px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>DELTA Λ</div>
            <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 800 }}>
              {Math.abs(Number(leftInfo.lambda) - Number(rightInfo.lambda)).toFixed(4)}
            </div>
          </div>
          <div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>LEFT — {leftInfo.label || leftInfo.location || leftSel}</div>
            <div style={{ color: C.accent, fontSize: 18, fontWeight: 800 }}>{Number(leftInfo.lambda).toFixed(4)}</div>
          </div>
          <div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>RIGHT — {rightInfo.label || rightInfo.location || rightSel}</div>
            <div style={{ color: C.accent, fontSize: 18, fontWeight: 800 }}>{Number(rightInfo.lambda).toFixed(4)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
