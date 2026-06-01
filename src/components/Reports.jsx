import { useEffect, useState } from 'react'
import { query } from '../lib/supabase'

const C = { card: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' }

function exportCsv(rows, filename) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

export default function Reports() {
  const [runs, setRuns] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    query('runs', { order: 'created_at', limit: 200 }).then(setRuns)
    query('deliverables', { order: 'created_at', limit: 200 }).then(setDeliverables)
  }, [])

  const filtered = runs.filter(r => {
    if (filter === 'complete' && r.status !== 'complete') return false
    if (filter === 'failed' && r.status !== 'failed') return false
    if (search && !r.location?.toLowerCase().includes(search.toLowerCase()) && !r.id?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalComplete = runs.filter(r => r.status === 'complete').length
  const totalFailed = runs.filter(r => r.status === 'failed').length
  const avgLambda = runs.filter(r => r.lambda_value > 0).reduce((a, r, _, arr) => a + r.lambda_value / arr.length, 0)

  function deliverablesForRun(runId) {
    return deliverables.filter(d => d.run_id === runId)
  }

  const exportRows = filtered.map(r => ({
    run_id: r.id,
    location: r.location,
    created_at: r.created_at,
    status: r.status,
    lambda_value: r.lambda_value,
    csi_score: r.csi_score,
    surge_index: r.surge_index,
    surge_regime: r.surge_regime,
    fema_high_risk: r.fema_high_risk,
    precip_mm: r.precip_mm,
  }))

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Reports</h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Full run history with deliverable links and export</p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'TOTAL RUNS', value: runs.length || '—', color: '#e2e8f0' },
          { label: 'COMPLETE', value: totalComplete || '—', color: C.ok },
          { label: 'FAILED', value: totalFailed || '—', color: totalFailed > 0 ? C.err : C.muted },
          { label: 'AVG LAMBDA', value: avgLambda > 0 ? avgLambda.toFixed(4) : '—', color: C.accent },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 20px', flex: 1 }}>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 20, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by location or run ID..."
            style={{ flex: 1, minWidth: 200, background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 10px', fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'complete', 'failed'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? C.accent : 'transparent', color: filter === f ? '#0a1628' : C.muted, border: `1px solid ${filter === f ? C.accent : C.border}`, borderRadius: 4, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => exportCsv(exportRows, 'stormgrid_runs.csv')} style={{ background: 'transparent', color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 4, padding: '6px 14px', fontSize: 11, cursor: 'pointer' }}>
            Export CSV
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
            {runs.length === 0 ? 'No runs yet — use Run Analysis to start.' : 'No runs match your filter.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Date', 'Location', 'Lambda', 'CSI', 'Surge', 'FEMA', 'Status', 'Deliverables'].map(h => (
                    <th key={h} style={{ color: C.muted, textAlign: 'left', padding: '0 12px 8px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const dels = deliverablesForRun(r.id)
                  return (
                    <tr key={r.id || i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                      <td style={{ padding: '8px 12px 8px 0', color: C.muted, whiteSpace: 'nowrap' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: '#e2e8f0', textTransform: 'capitalize' }}>{r.location || '—'}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: C.accent, fontWeight: 700 }}>{r.lambda_value?.toFixed(4) ?? '—'}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: '#e2e8f0' }}>{r.csi_score > 0 ? r.csi_score.toFixed(3) : '—'}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: '#e2e8f0' }}>{r.surge_regime || '—'}</td>
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <span style={{ color: r.fema_high_risk ? C.err : C.ok, fontWeight: 700 }}>{r.fema_high_risk ? 'HIGH' : r.fema_high_risk === false ? 'LOW' : '—'}</span>
                      </td>
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <span style={{ background: r.status === 'complete' ? '#14532d' : r.status === 'failed' ? '#450a0a' : '#0c2a3a', color: r.status === 'complete' ? C.ok : r.status === 'failed' ? C.err : C.warn, borderRadius: 3, padding: '2px 6px', fontSize: 10, fontWeight: 600 }}>
                          {r.status || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 0 8px 0' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {dels.length === 0 ? <span style={{ color: C.muted }}>—</span> : dels.map(d => (
                            d.storage_url ? (
                              <a key={d.id} href={d.storage_url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 10, textDecoration: 'none', background: C.accent + '22', borderRadius: 3, padding: '2px 6px' }}>
                                {d.file_type || 'file'}
                              </a>
                            ) : null
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ground truth reference */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginTop: 20 }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>JLM VALIDATION BENCHMARKS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { storm: 'Hurricane Irma 2017', location: 'Jacksonville FL', lambda: 0.0659, csi: '—', pod: '—', regime: 'RADIATIVE' },
            { storm: 'Hurricane Matthew 2016', location: 'Jacksonville FL', lambda: 0.0401, csi: '0.380', pod: '0.614', regime: 'RADIATIVE' },
          ].map(v => (
            <div key={v.storm} style={{ background: '#0a1628', border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{v.storm}</div>
              <div style={{ color: C.muted, fontSize: 10, marginBottom: 12 }}>{v.location}</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div><div style={{ color: C.muted, fontSize: 10 }}>Lambda</div><div style={{ color: C.accent, fontSize: 16, fontWeight: 800 }}>{v.lambda}</div></div>
                <div><div style={{ color: C.muted, fontSize: 10 }}>Regime</div><div style={{ color: C.ok, fontSize: 12, fontWeight: 700 }}>{v.regime}</div></div>
                <div><div style={{ color: C.muted, fontSize: 10 }}>CSI</div><div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>{v.csi}</div></div>
                <div><div style={{ color: C.muted, fontSize: 10 }}>POD</div><div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>{v.pod}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
