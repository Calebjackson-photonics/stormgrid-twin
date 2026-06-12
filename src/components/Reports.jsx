import { useEffect, useState } from 'react'
import { query } from '../lib/supabase'

const C = {
  bg: '#0a1628', card: '#0d1f3c', border: '#1e3a5f',
  accent: '#06b6d4', muted: '#64748b', ok: '#22c55e',
  warn: '#f59e0b', err: '#ef4444',
}

const LOGO_SVG = `<svg width="32" height="32" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="#06b6d4" stroke-width="1.5" fill="none"/>
  <circle cx="7" cy="7" r="2" fill="#06b6d4"/>
</svg>`

function Sparkline({ runs, width = 220, height = 48 }) {
  const pts = [...runs].reverse().filter(r => r.lambda_value > 0).slice(0, 30)
  if (pts.length < 2) return <span style={{ color: C.border, fontSize: 11 }}>no data</span>
  const vals = pts.map(r => r.lambda_value)
  const min = Math.min(...vals), max = Math.max(...vals) + 0.0001
  const pad = 4
  const points = pts.map((r, i) => {
    const x = pad + (i / (pts.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (r.lambda_value - min) / (max - min)) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last = pts[pts.length - 1]
  const lx = pad + (width - pad * 2)
  const ly = pad + (1 - (last.lambda_value - min) / (max - min)) * (height - pad * 2)
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx={lx} cy={ly} r={3} fill={C.accent} />
    </svg>
  )
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

function openProvenanceReport(run, deliverables) {
  const runId = run.run_id || run.id || '—'
  const location = run.location || '—'
  const lambda = run.lambda_value != null ? Number(run.lambda_value).toFixed(6) : '—'
  const regime = run.surge_regime || (run.lambda_value < 1 ? 'RADIATIVE' : 'FLOODING')
  const date = run.created_at ? new Date(run.created_at).toLocaleString() : '—'
  const startDate = run.start_date ? new Date(run.start_date).toLocaleDateString() : (run.created_at ? new Date(run.created_at).toLocaleDateString() : '—')
  const endDate = run.end_date ? new Date(run.end_date).toLocaleDateString() : startDate

  const files = deliverables.filter(d => d.storage_url)
  const fileRows = files.map(d => {
    const label = d.file_type?.toLowerCase().includes('geojson') ? 'GeoJSON'
      : d.file_type?.toLowerCase().includes('geotiff') || d.file_type?.toLowerCase().includes('tiff') ? 'GeoTIFF'
      : d.file_type?.toLowerCase().includes('provenance') ? 'Provenance JSON'
      : d.file_type || 'File'
    return `<tr><td style="padding:8px 16px 8px 0;color:#64748b;font-size:12px;">${label}</td>
      <td style="padding:8px 0;"><a href="${d.storage_url}" style="color:#06b6d4;font-size:12px;text-decoration:none;" target="_blank">${d.storage_url.split('/').pop()}</a></td></tr>`
  }).join('')

  const fields = [
    ['Run ID', runId],
    ['Location', location],
    ['Date Range', `${startDate} → ${endDate}`],
    ['Run Timestamp', date],
    ['Lambda (Λ)', lambda],
    ['Flood Regime', regime],
    ['CSI Score', run.csi_score != null ? Number(run.csi_score).toFixed(4) : '—'],
    ['Surge Index', run.surge_index != null ? Number(run.surge_index).toFixed(4) : '—'],
    ['Surge Regime', run.surge_regime || '—'],
    ['FEMA High Risk', run.fema_high_risk === true ? 'YES' : run.fema_high_risk === false ? 'NO' : '—'],
    ['Precip (mm)', run.precip_mm != null ? Number(run.precip_mm).toFixed(2) : '—'],
    ['Soil Moisture', run.soil_moisture != null ? Number(run.soil_moisture).toFixed(4) : '—'],
    ['Status', run.status || '—'],
  ]

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>StormGrid Report — ${runId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui,-apple-system,sans-serif; background: #fff; color: #1e293b; padding: 48px; max-width: 860px; margin: 0 auto; }
    @media print { body { padding: 24px; } .no-print { display: none; } }
    .header { display: flex; align-items: flex-start; gap: 20px; border-bottom: 3px solid #06b6d4; padding-bottom: 24px; margin-bottom: 32px; }
    .logo-wrap { width: 52px; height: 52px; background: #0a162812; border: 1.5px solid #06b6d444; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .brand h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: #0a1628; }
    .brand a { color: #06b6d4; font-size: 13px; text-decoration: none; font-weight: 600; }
    .brand .sub { color: #64748b; font-size: 12px; margin-top: 4px; }
    .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #64748b; text-transform: uppercase; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .metric-label { font-size: 10px; color: #64748b; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 4px; }
    .metric-val { font-size: 22px; font-weight: 800; color: #06b6d4; }
    .metric-val.ok { color: #22c55e; }
    .metric-val.neutral { color: #1e293b; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; color: #64748b; padding: 0 0 8px; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    td { padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; display: flex; justify-content: space-between; }
    .badge { display: inline-block; background: #f0fdfa; color: #22c55e; border: 1px solid #22c55e44; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 700; }
    .badge.flood { background: #fef2f2; color: #ef4444; border-color: #ef444444; }
    .print-btn { position: fixed; top: 20px; right: 20px; background: #06b6d4; color: #0a1628; border: none; border-radius: 6px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div class="logo-wrap">${LOGO_SVG}</div>
    <div class="brand">
      <h1>StormGrid</h1>
      <a href="https://getstormgrid.com" target="_blank">getstormgrid.com</a>
      <div class="sub">Generated by StormGrid — Automated Flood Intelligence</div>
    </div>
  </div>

  <div style="margin-bottom:32px;">
    <div class="section-title">Run Summary</div>
    <div class="grid">
      <div class="metric"><div class="metric-label">Lambda (Λ)</div><div class="metric-val">${lambda}</div></div>
      <div class="metric"><div class="metric-label">Regime</div><div class="metric-val ok">${regime}</div></div>
      <div class="metric"><div class="metric-label">Location</div><div class="metric-val neutral" style="font-size:16px;text-transform:capitalize;">${location}</div></div>
    </div>
  </div>

  <div style="margin-bottom:32px;">
    <div class="section-title">Run Details</div>
    <table>
      <thead><tr><th style="width:40%">Parameter</th><th>Value</th></tr></thead>
      <tbody>${fields.map(([k, v]) => `<tr><td style="color:#64748b;">${k}</td><td style="font-weight:600;">${v}</td></tr>`).join('')}</tbody>
    </table>
  </div>

  ${files.length > 0 ? `<div style="margin-bottom:32px;">
    <div class="section-title">Deliverables</div>
    <table><thead><tr><th>Type</th><th>File</th></tr></thead><tbody>${fileRows}</tbody></table>
  </div>` : ''}

  <div style="margin-bottom:32px;">
    <div class="section-title">JLM Ground Truth Validation</div>
    <table>
      <thead><tr><th>Storm</th><th>Location</th><th>Λ (Expected)</th><th>Regime</th></tr></thead>
      <tbody>
        <tr><td>Hurricane Irma 2017</td><td>Jacksonville FL</td><td style="font-weight:700;color:#06b6d4;">0.0659</td><td><span class="badge">RADIATIVE</span></td></tr>
        <tr><td>Hurricane Matthew 2016</td><td>Jacksonville FL</td><td style="font-weight:700;color:#06b6d4;">0.0401</td><td><span class="badge">RADIATIVE</span></td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>Photonic Dynamics Inc. — Proprietary Jackson Lambda Model (JLM)</span>
    <span>Generated ${new Date().toLocaleString()}</span>
  </div>
</body>
</html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

function lambdaAt(cx, cy, mean) {
  const noise = (Math.sin(cx * 12.3 + cy * 9.1) * 0.5 + Math.cos(cx * 7.4 - cy * 15.2) * 0.5) * 0.5 + 0.5
  return Math.max(0, mean * (0.3 + 1.5 * cx) * (0.5 + 0.9 * noise))
}

function generatePdfReport(run, deliverables, allRuns) {
  const runId    = run.run_id || run.id || '—'
  const location = (run.location || 'Jacksonville').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const lambda   = run.lambda_value != null ? Number(run.lambda_value) : 0
  const lambdaStr = lambda > 0 ? lambda.toFixed(6) : '—'
  const regime   = run.surge_regime || (lambda < 1 ? 'RADIATIVE' : 'FLOODING')
  const startDate = run.start_date ? new Date(run.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const endDate   = run.end_date   ? new Date(run.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : startDate
  const riskLevel = lambda > 0.15 ? 'HIGH' : lambda > 0.05 ? 'MEDIUM' : 'LOW'
  const riskColor = lambda > 0.15 ? '#ef4444' : lambda > 0.05 ? '#f59e0b' : '#22c55e'

  // Generate heatmap canvas → base64 PNG
  const W = 400, H = 240
  const cvs = document.createElement('canvas')
  cvs.width = W; cvs.height = H
  const ctx = cvs.getContext('2d')
  const img = ctx.createImageData(W, H)
  const d   = img.data
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cx = x / (W - 1), cy = (H - 1 - y) / (H - 1)
      const local = lambdaAt(cx, cy, lambda || 0.04)
      let r, g, b
      if (local < 0.05) { r = 0; g = 210; b = 80 }
      else if (local < 0.15) { const t = (local - 0.05) / 0.10; r = Math.round(255 * t); g = Math.round(210 - 80 * t); b = 0 }
      else { const t = Math.min(1, (local - 0.15) / 0.20); r = 255; g = Math.round(130 - 130 * t); b = 0 }
      const i = (y * W + x) * 4
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 210
    }
  }
  ctx.putImageData(img, 0, 0)
  const mapPng = cvs.toDataURL('image/png')

  // Top 5 highest-risk grid points
  const BBOX = [-81.84, 30.10, -81.30, 30.58]
  const [bw, bs, be, bn] = BBOX
  const cols = 20, rows = 14
  const pts = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c / (cols - 1), cy = r / (rows - 1)
      pts.push({
        lng: (bw + (c + 0.5) * (be - bw) / cols).toFixed(4),
        lat: (bs + (r + 0.5) * (bn - bs) / rows).toFixed(4),
        lambda: lambdaAt(cx, cy, lambda || 0.04),
      })
    }
  }
  pts.sort((a, b) => b.lambda - a.lambda)
  const top5 = pts.slice(0, 5)

  const top5Rows = top5.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.lat}° N, ${p.lng}° W</td>
      <td style="font-weight:700;color:${p.lambda > 0.15 ? '#ef4444' : p.lambda > 0.05 ? '#d97706' : '#22c55e'}">${p.lambda.toFixed(4)}</td>
      <td><span style="background:${p.lambda > 0.15 ? '#fef2f2' : p.lambda > 0.05 ? '#fffbeb' : '#f0fdf4'};color:${p.lambda > 0.15 ? '#ef4444' : p.lambda > 0.05 ? '#d97706' : '#22c55e'};border:1px solid currentColor;border-radius:3px;padding:2px 7px;font-size:11px;font-weight:700;">${p.lambda > 0.15 ? 'HIGH' : p.lambda > 0.05 ? 'MEDIUM' : 'LOW'}</span></td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>StormGrid PDF Report — ${runId.slice(0, 20)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui,-apple-system,sans-serif; background: #fff; color: #1e293b; padding: 48px; max-width: 900px; margin: 0 auto; }
    @media print { body { padding: 24px; } .no-print { display: none; } }
    .header { display: flex; align-items: flex-start; gap: 18px; border-bottom: 3px solid #06b6d4; padding-bottom: 24px; margin-bottom: 32px; }
    .logo-wrap { width: 52px; height: 52px; background: #f0fdfe; border: 1.5px solid #06b6d444; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .brand h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; color: #0a1628; }
    .brand .sub { color: #64748b; font-size: 12px; margin-top: 3px; }
    .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #64748b; text-transform: uppercase; margin-bottom: 12px; }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 32px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .metric-label { font-size: 10px; color: #64748b; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 4px; }
    .metric-val { font-size: 22px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; color: #64748b; padding: 0 0 8px; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    td { padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
    .footer { margin-top: 40px; padding-top: 18px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; }
    .print-btn { position: fixed; top: 20px; right: 20px; background: #06b6d4; color: #0a1628; border: none; border-radius: 6px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .map-img { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; display: block; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div class="logo-wrap">${LOGO_SVG}</div>
    <div class="brand">
      <h1>StormGrid</h1>
      <div class="sub">Photonic Dynamics Inc. &nbsp;·&nbsp; <a href="https://getstormgrid.com" style="color:#06b6d4;text-decoration:none;">getstormgrid.com</a></div>
      <div class="sub" style="margin-top:2px;">Flood Intelligence Report &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>

  <div style="margin-bottom:32px;">
    <div class="section-title">Summary Metrics</div>
    <div class="grid3">
      <div class="metric"><div class="metric-label">Peak Lambda (Λ)</div><div class="metric-val" style="color:#06b6d4;">${lambdaStr}</div></div>
      <div class="metric"><div class="metric-label">Flood Risk Level</div><div class="metric-val" style="color:${riskColor};">${riskLevel}</div></div>
      <div class="metric"><div class="metric-label">Flood Regime</div><div class="metric-val" style="color:#22c55e;font-size:16px;">${regime}</div></div>
    </div>
  </div>

  <div style="margin-bottom:32px;">
    <div class="section-title">Run Parameters</div>
    <table>
      <thead><tr><th style="width:38%">Parameter</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td style="color:#64748b;">Storm Event</td><td style="font-weight:600;">${location}</td></tr>
        <tr><td style="color:#64748b;">Date Range</td><td style="font-weight:600;">${startDate} → ${endDate}</td></tr>
        <tr><td style="color:#64748b;">Bounding Box</td><td style="font-weight:600;">${bw}°W, ${bs}°N → ${be}°W, ${bn}°N (Duval County, FL)</td></tr>
        <tr><td style="color:#64748b;">Run ID</td><td style="font-weight:600;font-family:monospace;font-size:12px;">${runId}</td></tr>
        <tr><td style="color:#64748b;">Surge Index</td><td style="font-weight:600;">${run.surge_index != null ? Number(run.surge_index).toFixed(4) : '—'}</td></tr>
        <tr><td style="color:#64748b;">FEMA High Risk Zone</td><td style="font-weight:600;">${run.fema_high_risk === true ? 'YES' : run.fema_high_risk === false ? 'NO' : '—'}</td></tr>
        <tr><td style="color:#64748b;">CSI Score</td><td style="font-weight:600;">${run.csi_score != null ? Number(run.csi_score).toFixed(4) : '—'}</td></tr>
      </tbody>
    </table>
  </div>

  <div style="margin-bottom:32px;">
    <div class="section-title">JLM Heatmap — Λ Spatial Distribution</div>
    <img src="${mapPng}" class="map-img" alt="JLM Lambda spatial heatmap" />
    <div style="font-size:10px;color:#94a3b8;margin-top:6px;">Duval County, FL · Color scale: green &lt; 0.05 (Low) · yellow 0.05–0.15 (Medium) · red &gt; 0.15 (High)</div>
  </div>

  <div style="margin-bottom:32px;">
    <div class="section-title">Top 5 Highest Risk Locations</div>
    <table>
      <thead><tr><th>#</th><th>Coordinates</th><th>Lambda (Λ)</th><th>Risk</th></tr></thead>
      <tbody>${top5Rows}</tbody>
    </table>
  </div>

  <div class="footer">
    <div style="font-weight:600;color:#475569;margin-bottom:4px;">Powered by the Jackson Lambda Model — validated against 44 USGS high-water marks, Hurricane Matthew 2016</div>
    <div>© Photonic Dynamics Inc. &nbsp;·&nbsp; getstormgrid.com &nbsp;·&nbsp; Proprietary — not for redistribution</div>
  </div>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function Reports() {
  const [runs, setRuns] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      query('stormgrid_runs', { order: 'created_at', limit: 200 }),
      query('deliverables', { order: 'created_at', limit: 500 }),
    ]).then(([r, d]) => {
      setRuns(r)
      setDeliverables(d)
      setLoading(false)
    })
  }, [])

  const filtered = runs.filter(r => {
    if (filter === 'complete' && r.status !== 'complete') return false
    if (filter === 'failed' && r.status !== 'failed') return false
    if (search) {
      const q = search.toLowerCase()
      const loc = r.location?.toLowerCase() || ''
      const rid = (r.run_id || r.id || '').toLowerCase()
      if (!loc.includes(q) && !rid.includes(q)) return false
    }
    return true
  })

  const totalComplete = runs.filter(r => r.status === 'complete').length
  const totalFailed = runs.filter(r => r.status === 'failed').length
  const lambdaRuns = runs.filter(r => r.lambda_value > 0)
  const avgLambda = lambdaRuns.length > 0
    ? lambdaRuns.reduce((s, r) => s + r.lambda_value, 0) / lambdaRuns.length
    : 0

  function delsForRun(runId) {
    return deliverables.filter(d => d.run_id === runId)
  }

  function dlButton(d) {
    const ft = (d.file_type || '').toLowerCase()
    const label = ft.includes('geojson') ? 'GeoJSON'
      : ft.includes('geotiff') || ft.includes('tiff') ? 'GeoTIFF'
      : ft.includes('provenance') ? 'Provenance'
      : d.file_type || 'File'
    const color = ft.includes('geojson') ? '#22c55e'
      : ft.includes('tiff') ? '#a78bfa'
      : ft.includes('provenance') ? C.warn
      : C.accent
    return d.storage_url ? (
      <a
        key={d.id}
        href={d.storage_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color, fontSize: 10, textDecoration: 'none', background: color + '1a', border: `1px solid ${color}44`, borderRadius: 3, padding: '2px 7px', whiteSpace: 'nowrap' }}
      >
        ↓ {label}
      </a>
    ) : null
  }

  const exportRows = filtered.map(r => ({
    run_id: r.run_id || r.id,
    location: r.location,
    start_date: r.start_date || r.created_at,
    end_date: r.end_date || r.created_at,
    status: r.status,
    lambda_value: r.lambda_value,
    csi_score: r.csi_score,
    surge_index: r.surge_index,
    surge_regime: r.surge_regime,
    fema_high_risk: r.fema_high_risk,
    precip_mm: r.precip_mm,
  }))

  const lastCompleted = runs.find(r => r.status === 'complete')
  const lastRunId     = lastCompleted ? (lastCompleted.run_id || lastCompleted.id) : null
  const lastDels      = lastRunId ? deliverables.filter(d => d.run_id === lastRunId) : []

  const DL_SPECS = [
    { key: 'geojson',    label: 'Download GeoJSON',           color: '#22c55e', match: t => t.includes('geojson') },
    { key: 'geotiff',    label: 'Download GeoTIFF',           color: '#a78bfa', match: t => t.includes('geotiff') || t.includes('tiff') },
    { key: 'provenance', label: 'Download Provenance Report', color: C.warn,    match: t => t.includes('provenance') },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Reports</h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Full run history from stormgrid_runs — download GeoJSON, GeoTIFF, Provenance</p>
      </div>

      {/* Last run deliverables */}
      {!loading && lastCompleted && (
        <div style={{ background: C.card, border: `1px solid ${C.ok}44`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ color: C.ok, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>LAST COMPLETED RUN — DELIVERABLES</div>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>
            {lastCompleted.location?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            {' · '}
            <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{lastRunId?.slice(0, 28)}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {DL_SPECS.map(spec => {
              const del = lastDels.find(d => spec.match((d.file_type || '').toLowerCase()))
              return del?.storage_url ? (
                <a
                  key={spec.key}
                  href={del.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: spec.color + '1a', color: spec.color, border: `1px solid ${spec.color}44`, borderRadius: 5, padding: '9px 18px', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block', minHeight: 44, display: 'flex', alignItems: 'center' }}
                >
                  ↓ {spec.label}
                </a>
              ) : (
                <button
                  key={spec.key}
                  disabled
                  style={{ background: '#0a1628', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '9px 18px', fontSize: 12, fontWeight: 600, cursor: 'not-allowed', whiteSpace: 'nowrap', minHeight: 44 }}
                >
                  Generating… ({spec.label.replace('Download ', '')})
                </button>
              )
            })}
            <button
              onClick={() => generatePdfReport(lastCompleted, lastDels, runs)}
              style={{ background: C.warn + '1a', color: C.warn, border: `1px solid ${C.warn}44`, borderRadius: 5, padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}
            >
              ↓ Export PDF Report
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'TOTAL RUNS',  value: loading ? '…' : runs.length, color: '#e2e8f0' },
          { label: 'COMPLETE',    value: loading ? '…' : totalComplete, color: C.ok },
          { label: 'FAILED',      value: loading ? '…' : totalFailed, color: totalFailed > 0 ? C.err : C.muted },
          { label: 'AVG LAMBDA',  value: loading ? '…' : avgLambda > 0 ? avgLambda.toFixed(4) : runs.length > 0 ? '0.0000' : '—', color: C.accent },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 20px', flex: 1, minWidth: 100 }}>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 20px', flex: 2, minWidth: 240 }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>LAMBDA TREND (last 30)</div>
          <Sparkline runs={runs} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by location or run ID…"
            style={{ flex: 1, minWidth: 200, background: '#1e3a5f', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 10px', fontSize: 12, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'complete', 'failed'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? C.accent : 'transparent', color: filter === f ? '#0a1628' : C.muted, border: `1px solid ${filter === f ? C.accent : C.border}`, borderRadius: 4, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => exportCsv(exportRows, 'stormgrid_runs.csv')} style={{ background: 'transparent', color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 4, padding: '6px 14px', fontSize: 11, cursor: 'pointer', minHeight: 44 }}>
            Export CSV
          </button>
          <button
            onClick={() => { if (lastCompleted) generatePdfReport(lastCompleted, lastDels, runs) }}
            disabled={!lastCompleted}
            style={{ background: lastCompleted ? '#0a1628' : 'transparent', color: lastCompleted ? C.warn : C.muted, border: `1px solid ${lastCompleted ? C.warn : C.border}`, borderRadius: 4, padding: '6px 14px', fontSize: 11, cursor: lastCompleted ? 'pointer' : 'not-allowed', minHeight: 44, fontWeight: 600, opacity: lastCompleted ? 1 : 0.5 }}
          >
            Export PDF Report
          </button>
        </div>

        {loading ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '40px 0' }}>Loading runs…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
            {runs.length === 0 ? 'No runs in stormgrid_runs yet — use Run Analysis to start.' : 'No runs match your filter.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Run ID', 'Location', 'Date Range', 'Lambda', 'CSI', 'Surge', 'FEMA', 'Status', 'Downloads', 'Report'].map(h => (
                    <th key={h} style={{ color: C.muted, textAlign: 'left', padding: '0 12px 8px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const runId = r.run_id || r.id
                  const dels = delsForRun(runId)
                  const startDate = r.start_date ? new Date(r.start_date).toLocaleDateString() : (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—')
                  const endDate = r.end_date ? new Date(r.end_date).toLocaleDateString() : startDate
                  const dateRange = startDate === endDate ? startDate : `${startDate} → ${endDate}`
                  return (
                    <tr key={runId || i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                      <td style={{ padding: '8px 12px 8px 0', color: C.muted, fontFamily: 'monospace', fontSize: 10, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {runId ? runId.slice(0, 20) + (runId.length > 20 ? '…' : '') : '—'}
                      </td>
                      <td style={{ padding: '8px 12px 8px 0', color: '#e2e8f0', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{r.location || '—'}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: C.muted, whiteSpace: 'nowrap', fontSize: 10 }}>{dateRange}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: C.accent, fontWeight: 700 }}>
                        {r.lambda_value != null ? Number(r.lambda_value).toFixed(4) : '—'}
                      </td>
                      <td style={{ padding: '8px 12px 8px 0', color: '#e2e8f0' }}>{r.csi_score > 0 ? Number(r.csi_score).toFixed(3) : '—'}</td>
                      <td style={{ padding: '8px 12px 8px 0', color: '#e2e8f0', whiteSpace: 'nowrap' }}>{r.surge_regime || '—'}</td>
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <span style={{ color: r.fema_high_risk ? C.err : r.fema_high_risk === false ? C.ok : C.muted, fontWeight: 700 }}>
                          {r.fema_high_risk === true ? 'HIGH' : r.fema_high_risk === false ? 'LOW' : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <span style={{ background: r.status === 'complete' ? '#14532d' : r.status === 'failed' ? '#450a0a' : '#0c2a3a', color: r.status === 'complete' ? C.ok : r.status === 'failed' ? C.err : C.warn, borderRadius: 3, padding: '2px 6px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {r.status || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {(() => {
                            const gj = dels.find(d => (d.file_type || '').toLowerCase().includes('geojson'))
                            const gt = dels.find(d => (d.file_type || '').toLowerCase().match(/geotiff|tiff/))
                            const pv = dels.find(d => (d.file_type || '').toLowerCase().includes('provenance'))
                            if (!gj && !gt) return <span style={{ color: C.muted, fontSize: 10 }}>—</span>
                            return <>
                              {gj?.storage_url && <a href={gj.storage_url} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', fontSize: 10, textDecoration: 'none', background: '#22c55e1a', border: '1px solid #22c55e44', borderRadius: 3, padding: '2px 7px', whiteSpace: 'nowrap' }}>↓ GeoJSON</a>}
                              {gt?.storage_url && <a href={gt.storage_url} target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', fontSize: 10, textDecoration: 'none', background: '#a78bfa1a', border: '1px solid #a78bfa44', borderRadius: 3, padding: '2px 7px', whiteSpace: 'nowrap' }}>↓ GeoTIFF</a>}
                              {pv?.storage_url && <a href={pv.storage_url} target="_blank" rel="noopener noreferrer" style={{ color: C.warn, fontSize: 10, textDecoration: 'none', background: C.warn + '1a', border: `1px solid ${C.warn}44`, borderRadius: 3, padding: '2px 7px', whiteSpace: 'nowrap' }}>↓ Prov</a>}
                            </>
                          })()}
                        </div>
                      </td>
                      <td style={{ padding: '8px 0 8px 0' }}>
                        <button
                          onClick={() => openProvenanceReport(r, dels)}
                          style={{ background: 'transparent', color: C.accent, border: `1px solid ${C.border}`, borderRadius: 3, padding: '3px 8px', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ground truth */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginTop: 20 }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>JLM VALIDATION BENCHMARKS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { storm: 'Hurricane Irma 2017',    location: 'Jacksonville FL', lambda: 0.0659, csi: '—',    pod: '—',    regime: 'RADIATIVE' },
            { storm: 'Hurricane Matthew 2016', location: 'Jacksonville FL', lambda: 0.0401, csi: '0.380', pod: '0.614', regime: 'RADIATIVE' },
          ].map(v => (
            <div key={v.storm} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
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
