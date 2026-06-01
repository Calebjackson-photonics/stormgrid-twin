import { useEffect, useState } from 'react'
import { query } from '../lib/supabase'

const C = { card: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' }
const API = 'https://api.getstormgrid.com'

// apiKey must match the key returned by GET /api/adapters/health
const ADAPTERS = [
  { key: 'dem',      apiKey: 'usgs_dem',    name: 'USGS 3DEP',         source: 'USGS ImageServer',        cell: 5,    desc: '256×256 GeoTIFF elevation raster + gradient' },
  { key: 'precip',   apiKey: 'mrms',        name: 'Precipitation',      source: 'S3 MRMS → NWS → Open-Meteo', cell: 6, desc: 'Token-free 4-source priority stack' },
  { key: 'osm',      apiKey: 'osm',         name: 'OSM Waterways',      source: 'Overpass API',            cell: 7,    desc: 'Channel width raster via cKDTree distance' },
  { key: 'ssurgo',   apiKey: 'ssurgo',      name: 'SSURGO Ksat',        source: 'NRCS SDMDataAccess',      cell: '7B', desc: 'Soil permeability: float(ksat) × 3.6 μm/s → mm/hr' },
  { key: 'nwis',     apiKey: 'nwis',        name: 'USGS Stream Gauges', source: 'NWIS IV → DV fallback',   cell: '7C', desc: 'GAUGE_FACTOR multiplies channel width' },
  { key: 'fema',     apiKey: 'fema',        name: 'FEMA NFHL',          source: 'ArcGIS REST Layer 28',    cell: '7D', desc: 'SFHA flood zones, 16-tile pagination' },
  { key: 'surge',    apiKey: 'storm_surge', name: 'Storm Surge',        source: 'NOAA CO-OPS + SLOSH MOM', cell: '7E', desc: 'Observed − predicted tide; SURGE_INDEX = surge/1.52' },
  { key: 'smap',     apiKey: 'smap',        name: 'SMAP Soil Moisture', source: 'NASA SPL3SMP_E',          cell: '7F', desc: '9km EASE-Grid-2 resampled to DEM resolution' },
  { key: 'sentinel', apiKey: 'sentinel',    name: 'Sentinel SAR',       source: 'ASF Alaska API',          cell: 8,    desc: 'Scene count for flood extent validation' },
]

// healthData: undefined = loading, null = health endpoint unreachable, object = loaded
function resolveStatus(healthData, apiKey) {
  if (healthData === undefined) return 'checking'
  if (healthData === null) return 'stale'
  return healthData[apiKey]?.status === 'live' ? 'ok' : 'down'
}

function AdapterCard({ adapter, output, healthData }) {
  const lastRun = output?.created_at ? new Date(output.created_at) : null
  const status = resolveStatus(healthData, adapter.apiKey)
  const statusColor = { ok: C.ok, stale: C.warn, down: C.err, checking: C.muted }[status]
  const statusLabel = { ok: 'LIVE', stale: 'STALE', down: 'DOWN', checking: '...' }[status]

  return (
    <div style={{ background: C.card, border: `1px solid ${status === 'ok' ? C.border : statusColor + '44'}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>{adapter.name}</div>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Cell {adapter.cell}</div>
        </div>
        <span style={{ background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{statusLabel}</span>
      </div>
      <div style={{ color: C.muted, fontSize: 11 }}>{adapter.desc}</div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
          <span style={{ color: C.muted }}>Source</span>
          <span style={{ color: '#e2e8f0' }}>{adapter.source}</span>
        </div>
        {lastRun && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span style={{ color: C.muted }}>Last run</span>
            <span style={{ color: '#e2e8f0' }}>{lastRun.toLocaleDateString()}</span>
          </div>
        )}
        {output?.run_id && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span style={{ color: C.muted }}>Run ID</span>
            <span style={{ color: C.muted, fontFamily: 'monospace' }}>{output.run_id?.slice(0, 20)}...</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdapterHealth() {
  const [outputs, setOutputs] = useState([])
  const [healthData, setHealthData] = useState(undefined)

  useEffect(() => {
    let cancelled = false

    const checkAdapters = () => {
      if (cancelled) return
      fetch(`${API}/api/adapters/health`)
        .then(r => r.json())
        .then(d => { if (!cancelled) setHealthData(d) })
        .catch(() => { if (!cancelled) setHealthData(null) })
    }

    checkAdapters()
    const pollId = setInterval(checkAdapters, 60000)

    query('adapter_outputs', { order: 'created_at', limit: 100 }).then(setOutputs)

    return () => { cancelled = true; clearInterval(pollId) }
  }, [])

  function latestFor(key) {
    return outputs.find(o => o.adapter_name?.toLowerCase().includes(key.toLowerCase()))
  }

  const apiOk = healthData !== undefined && healthData !== null
  const liveCount = ADAPTERS.filter(a => healthData?.[a.apiKey]?.status === 'live').length

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Adapter Health</h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Real-time status of all 9 StormGrid data adapters</p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'API', value: healthData === undefined ? '...' : apiOk ? 'LIVE' : 'DOWN', color: healthData === undefined ? C.muted : apiOk ? C.ok : C.err },
          { label: 'ADAPTERS LIVE', value: healthData === undefined ? '...' : `${liveCount} / ${ADAPTERS.length}`, color: liveCount === ADAPTERS.length ? C.ok : liveCount > 5 ? C.warn : C.err },
          { label: 'DATA SOURCES', value: '9 federal APIs', color: C.accent },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 20px', flex: 1 }}>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 20, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {ADAPTERS.map(a => <AdapterCard key={a.key} adapter={a} output={latestFor(a.key)} healthData={healthData} />)}
      </div>
    </div>
  )
}
