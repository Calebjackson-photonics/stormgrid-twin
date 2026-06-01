import { useEffect, useState } from 'react'
import { query } from '../lib/supabase'

const C = { card: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' }
const API = 'https://api.getstormgrid.com'

const ADAPTERS = [
  { key: 'dem',       name: 'USGS 3DEP',         source: 'USGS ImageServer',       cell: 5,  desc: '256×256 GeoTIFF elevation raster + gradient' },
  { key: 'precip',    name: 'Precipitation',      source: 'S3 MRMS → NWS → Open-Meteo', cell: 6, desc: 'Token-free 4-source priority stack' },
  { key: 'osm',       name: 'OSM Waterways',      source: 'Overpass API',           cell: 7,  desc: 'Channel width raster via cKDTree distance' },
  { key: 'ssurgo',    name: 'SSURGO Ksat',        source: 'NRCS SDMDataAccess',     cell: '7B', desc: 'Soil permeability: float(ksat) × 3.6 μm/s → mm/hr' },
  { key: 'nwis',      name: 'USGS Stream Gauges', source: 'NWIS IV → DV fallback',  cell: '7C', desc: 'GAUGE_FACTOR multiplies channel width' },
  { key: 'fema',      name: 'FEMA NFHL',          source: 'ArcGIS REST Layer 28',   cell: '7D', desc: 'SFHA flood zones, 16-tile pagination' },
  { key: 'surge',     name: 'Storm Surge',        source: 'NOAA CO-OPS + SLOSH MOM',cell: '7E', desc: 'Observed − predicted tide; SURGE_INDEX = surge/1.52' },
  { key: 'smap',      name: 'SMAP Soil Moisture', source: 'NASA SPL3SMP_E',         cell: '7F', desc: '9km EASE-Grid-2 resampled to DEM resolution' },
  { key: 'sentinel',  name: 'Sentinel SAR',       source: 'ASF Alaska API',         cell: 8,  desc: 'Scene count for flood extent validation' },
]

function AdapterCard({ adapter, output, apiOk }) {
  const hasData = Boolean(output)
  const lastRun = output?.created_at ? new Date(output.created_at) : null
  const age = lastRun ? Math.round((Date.now() - lastRun) / 1000 / 60 / 60) : null
  const status = !apiOk ? 'api_down' : hasData ? (age !== null && age > 48 ? 'stale' : 'ok') : 'no_data'
  const statusColor = { ok: C.ok, stale: C.warn, no_data: C.muted, api_down: C.err }[status]
  const statusLabel = { ok: 'LIVE', stale: 'STALE', no_data: 'NO DATA', api_down: 'API DOWN' }[status]

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
        {output?.storage_url && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span style={{ color: C.muted }}>Last run</span>
            <span style={{ color: '#e2e8f0' }}>{lastRun?.toLocaleDateString() || '—'}</span>
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
  const [apiOk, setApiOk] = useState(null)

  useEffect(() => {
    fetch(`${API}/health`).then(r => r.ok ? setApiOk(true) : setApiOk(false)).catch(() => setApiOk(false))
    query('adapter_outputs', { order: 'created_at', limit: 100 }).then(setOutputs)
  }, [])

  function latestFor(key) {
    return outputs.find(o => o.adapter_name?.toLowerCase().includes(key.toLowerCase()))
  }

  const liveCount = ADAPTERS.filter(a => Boolean(latestFor(a.key))).length

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Adapter Health</h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Real-time status of all 9 StormGrid data adapters</p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'API', value: apiOk === null ? '...' : apiOk ? 'LIVE' : 'DOWN', color: apiOk ? C.ok : C.err },
          { label: 'ADAPTERS WITH DATA', value: `${liveCount} / ${ADAPTERS.length}`, color: liveCount === ADAPTERS.length ? C.ok : liveCount > 5 ? C.warn : C.err },
          { label: 'DATA SOURCES', value: '9 federal APIs', color: C.accent },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 20px', flex: 1 }}>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 20, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {ADAPTERS.map(a => <AdapterCard key={a.key} adapter={a} output={latestFor(a.key)} apiOk={apiOk} />)}
      </div>
    </div>
  )
}
