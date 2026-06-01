import { useEffect, useState } from 'react'
import { query } from '../lib/supabase'

const API = 'https://api.getstormgrid.com'
const C = { card: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' }

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', flex: 1, minWidth: 160 }}>
      <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div style={{ color: color || '#e2e8f0', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: 11 }}>{sub}</div>}
    </div>
  )
}

function StatusDot({ ok }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ok ? C.ok : C.err, marginRight: 6, boxShadow: ok ? `0 0 6px ${C.ok}` : 'none' }} />
}

const ADAPTERS = ['USGS 3DEP', 'MRMS Precip', 'OSM Waterways', 'SSURGO Ksat', 'NWIS Gauges', 'FEMA NFHL', 'Storm Surge', 'Sentinel SAR', 'SMAP Soil']

export default function Overview() {
  const [runs, setRuns] = useState([])
  const [apiOk, setApiOk] = useState(null)
  const [apiVersion, setApiVersion] = useState('')
  const [adapterOutputs, setAdapterOutputs] = useState([])

  useEffect(() => {
    let cancelled = false

    const checkHealth = (attempt = 0) => {
      if (cancelled) return
      fetch(`${API}/health`)
        .then(r => r.json())
        .then(d => {
          if (cancelled) return
          setApiOk(true)
          setApiVersion(d.version || '')
        })
        .catch(() => {
          if (cancelled) return
          if (attempt < 2) {
            setTimeout(() => checkHealth(attempt + 1), 3000)
          } else {
            setApiOk(false)
          }
        })
    }

    checkHealth()
    const pollId = setInterval(() => checkHealth(), 30000)

    query('runs', { order: 'created_at', limit: 10 }).then(setRuns)
    query('adapter_outputs', { order: 'created_at', limit: 50 }).then(setAdapterOutputs)

    return () => { cancelled = true; clearInterval(pollId) }
  }, [])

  const totalRuns = runs.length
  const lastRun = runs[0]
  const avgCsi = runs.filter(r => r.csi_score > 0).reduce((a, r, _, arr) => a + r.csi_score / arr.length, 0)

  const adapterStatus = ADAPTERS.map(name => {
    const key = name.toLowerCase().replace(/\s+/g, '_')
    const match = adapterOutputs.find(a => a.adapter_name && a.adapter_name.toLowerCase().includes(key.split('_')[0]))
    return { name, ok: Boolean(match), lastRun: match?.created_at }
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Overview</h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>StormGrid platform status and recent activity</p>
      </div>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="API STATUS" value={apiOk === null ? '...' : apiOk ? 'LIVE' : 'DOWN'} sub={apiOk ? `v${apiVersion}` : 'api.getstormgrid.com'} color={apiOk === null ? C.muted : apiOk ? C.ok : C.err} />
        <StatCard label="TOTAL RUNS" value={totalRuns || '—'} sub="in Supabase" />
        <StatCard label="LAST LAMBDA" value={lastRun ? lastRun.lambda_value?.toFixed(4) ?? '—' : '—'} sub={lastRun?.location || 'no runs yet'} color={C.accent} />
        <StatCard label="AVG CSI" value={avgCsi > 0 ? avgCsi.toFixed(3) : '—'} sub="Critical Success Index" color={avgCsi > 0.3 ? C.ok : avgCsi > 0 ? C.warn : C.muted} />
        <StatCard label="JLM GROUND TRUTH" value="0.0659" sub="Irma 2017 Jacksonville" color={C.accent} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent runs */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>RECENT RUNS</div>
          {runs.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12 }}>No runs yet — use Run Analysis to start.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Date', 'Location', 'Lambda', 'CSI', 'Status'].map(h => (
                    <th key={h} style={{ color: C.muted, textAlign: 'left', padding: '0 8px 8px 0', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: '6px 8px 6px 0', color: C.muted }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: '#e2e8f0', textTransform: 'capitalize' }}>{r.location || '—'}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: C.accent, fontWeight: 700 }}>{r.lambda_value?.toFixed(4) ?? '—'}</td>
                    <td style={{ padding: '6px 8px 6px 0', color: '#e2e8f0' }}>{r.csi_score > 0 ? r.csi_score.toFixed(3) : '—'}</td>
                    <td style={{ padding: '6px 0 6px 0' }}>
                      <span style={{ background: r.status === 'complete' ? '#14532d' : r.status === 'failed' ? '#450a0a' : '#0c2a3a', color: r.status === 'complete' ? C.ok : r.status === 'failed' ? C.err : C.warn, borderRadius: 3, padding: '2px 6px', fontSize: 10, fontWeight: 600 }}>
                        {r.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Adapter health summary */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>ADAPTER STATUS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {adapterStatus.map(a => (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#e2e8f0', fontSize: 12, display: 'flex', alignItems: 'center' }}>
                  <StatusDot ok={a.ok} />{a.name}
                </span>
                <span style={{ color: C.muted, fontSize: 10 }}>{a.lastRun ? new Date(a.lastRun).toLocaleDateString() : 'no data'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* JLM ground truth */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginTop: 20 }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>JLM VALIDATION — GROUND TRUTH</div>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          {[
            { label: 'Hurricane Irma 2017', lambda: '0.0659', regime: 'RADIATIVE', csi: '—', precip: '254.3 mm' },
            { label: 'Hurricane Matthew 2016', lambda: '0.0401', regime: 'RADIATIVE', csi: '0.380', precip: '173.1 mm (peak)' },
          ].map(v => (
            <div key={v.label}>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>{v.label}</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div><div style={{ color: C.muted, fontSize: 10 }}>Lambda</div><div style={{ color: C.accent, fontSize: 18, fontWeight: 800 }}>{v.lambda}</div></div>
                <div><div style={{ color: C.muted, fontSize: 10 }}>Regime</div><div style={{ color: C.ok, fontSize: 13, fontWeight: 700 }}>{v.regime}</div></div>
                <div><div style={{ color: C.muted, fontSize: 10 }}>CSI</div><div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>{v.csi}</div></div>
                <div><div style={{ color: C.muted, fontSize: 10 }}>Precip</div><div style={{ color: '#e2e8f0', fontSize: 13 }}>{v.precip}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
