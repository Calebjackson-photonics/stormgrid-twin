import { useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'

const API = 'https://api.getstormgrid.com'
const C = { card: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' }

const FL_LOCATIONS = ['jacksonville', 'miami', 'tampa', 'orlando', 'fort_lauderdale', 'sarasota', 'pensacola', 'gainesville', 'tallahassee', 'daytona_beach', 'fort_myers', 'key_west', 'panama_city', 'ocala', 'saint_augustine', 'port_st_lucie']

const SOURCES = [
  { id: 'noaa_mrms',  label: 'NOAA MRMS',          desc: 'Multi-Radar Multi-Sensor precipitation (S3, token-free)' },
  { id: 'usgs_gauge', label: 'USGS Stream Gauge',   desc: 'NWIS instantaneous/daily stage height' },
  { id: 'smap_soil',  label: 'SMAP Soil Moisture',  desc: 'NASA SPL3SMP_E 9km EASE-Grid-2' },
  { id: 'fema_zones', label: 'FEMA Flood Zones',    desc: 'NFHL SFHA polygons via ArcGIS REST Layer 28' },
  { id: 'ssurgo',     label: 'SSURGO Soil Ksat',    desc: 'NRCS SDMDataAccess saturated hydraulic conductivity' },
  { id: 'usgs_dem',   label: 'USGS 3DEP Elevation', desc: 'Digital elevation model + gradient' },
]

const SOURCE_LABEL = Object.fromEntries(SOURCES.map(s => [s.id, s.label]))

function flattenSources(sources) {
  if (!sources) return []
  return Object.entries(sources).flatMap(([src, data]) => {
    const label = SOURCE_LABEL[src] || src
    if (data?.error) return [{ field: `${label} — error`, value: data.error }]
    return Object.entries(data)
      .filter(([k]) => k !== 'zone_counts')
      .map(([k, v]) => ({
        field: `${label} — ${k.replace(/_/g, ' ')}`,
        value: typeof v === 'boolean' ? (v ? 'YES' : 'NO') : String(v ?? '—'),
      }))
  })
}

function exportCsv(rows, filename) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
}

export default function DataQuery({ apiKey: apiKeyProp = 'sg_ent_demo' }) {
  const [location, setLocation]   = useState('jacksonville')
  const [startDate, setStartDate] = useState('2016-10-06')
  const [endDate, setEndDate]     = useState('2016-10-08')
  const [selected, setSelected]   = useState(new Set(['noaa_mrms', 'usgs_gauge', 'ssurgo']))
  const [apiKey, setApiKey]       = useState(apiKeyProp)
  const [loading, setLoading]     = useState(false)
  const [results, setResults]     = useState(null)
  const [error, setError]         = useState('')

  function toggle(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleQuery() {
    setLoading(true); setError(''); setResults(null)
    try {
      const res = await fetch(`${API}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ location, start_date: startDate, end_date: endDate, sources: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return }
      setResults(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const isMobile    = useIsMobile()
  const resultRows  = flattenSources(results?.sources)
  const returnedOk  = results ? Object.values(results.sources || {}).filter(v => !v?.error).length : 0
  const returnedAll = results ? Object.keys(results.sources || {}).length : 0

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Data Query Tool</h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Fetch raw scalar data from individual adapters — no full pipeline run required</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '360px 1fr', gap: 20 }}>
        {/* Query form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
            <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>QUERY PARAMETERS</div>

            <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>Location</label>
            <select value={location} onChange={e => setLocation(e.target.value)} style={{ width: '100%', background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 10px', fontSize: 12, marginBottom: 12 }}>
              {FL_LOCATIONS.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>

            <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 10px', fontSize: 12, marginBottom: 12, boxSizing: 'border-box' }} />

            <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 10px', fontSize: 12, marginBottom: 12, boxSizing: 'border-box' }} />

            <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 4 }}>API Key</label>
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ width: '100%', background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 10px', fontSize: 12, marginBottom: 16, boxSizing: 'border-box' }} />

            <button onClick={handleQuery} disabled={loading || selected.size === 0} style={{ width: '100%', background: loading ? '#1e3a5f' : C.accent, color: loading ? C.muted : '#0a1628', border: 'none', borderRadius: 4, padding: '10px', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? `FETCHING ${selected.size} SOURCE${selected.size !== 1 ? 'S' : ''}...` : 'QUERY DATA'}
            </button>
            {error && <div style={{ color: C.err, fontSize: 11, marginTop: 8 }}>{error}</div>}
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
            <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>DATA SOURCES</div>
            {SOURCES.map(src => (
              <label key={src.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.has(src.id)} onChange={() => toggle(src.id)} style={{ marginTop: 2, accentColor: C.accent }} />
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{src.label}</div>
                  <div style={{ color: C.muted, fontSize: 10 }}>{src.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>RESULTS</div>
            {results && (
              <button onClick={() => exportCsv(resultRows, `stormgrid_${location}_${startDate}.csv`)} style={{ background: 'transparent', color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 4, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>
                Export CSV
              </button>
            )}
          </div>

          {!results && !loading && (
            <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', paddingTop: 60 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              Select sources and click Query Data. Returns raw scalars in ~15–20s — no full pipeline run.
            </div>
          )}

          {loading && (
            <div style={{ color: C.accent, fontSize: 12, textAlign: 'center', paddingTop: 60 }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>◌</div>
              Fetching {selected.size} adapter{selected.size !== 1 ? 's' : ''} in parallel...
            </div>
          )}

          {results && (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#0a1628', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 16px', flex: 1 }}>
                  <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>SOURCES OK</div>
                  <div style={{ color: returnedOk === returnedAll ? C.ok : C.warn, fontSize: 20, fontWeight: 800, marginTop: 4 }}>{returnedOk} / {returnedAll}</div>
                </div>
                <div style={{ background: '#0a1628', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 16px', flex: 1 }}>
                  <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>LOCATION</div>
                  <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginTop: 4, textTransform: 'capitalize' }}>{results.location?.replace(/_/g, ' ')}</div>
                </div>
                <div style={{ background: '#0a1628', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 16px', flex: 2 }}>
                  <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>DATE RANGE</div>
                  <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{results.start_date} → {results.end_date}</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ color: C.muted, textAlign: 'left', padding: '0 12px 8px 0', fontWeight: 600 }}>Field</th>
                    <th style={{ color: C.muted, textAlign: 'left', padding: '0 0 8px', fontWeight: 600 }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {resultRows.map(r => (
                    <tr key={r.field} style={{ borderBottom: `1px solid ${C.border}22` }}>
                      <td style={{ padding: '7px 12px 7px 0', color: C.muted }}>{r.field}</td>
                      <td style={{ padding: '7px 0', color: '#e2e8f0', fontWeight: 600 }}>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
