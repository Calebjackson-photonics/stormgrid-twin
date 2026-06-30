import { useState } from 'react'

const API = 'https://api.getstormgrid.com'

const C = {
  bg: '#0a1628', card: '#0d1f3c', border: '#1e3a5f',
  accent: '#06b6d4', muted: '#64748b', ok: '#22c55e',
  warn: '#f59e0b', err: '#ef4444',
}

const PIER_SHAPES = [
  { value: 'round_nose',         label: 'Round Nose' },
  { value: 'square_nose',        label: 'Square Nose' },
  { value: 'circular_cylinder',  label: 'Circular Cylinder' },
  { value: 'sharp_nose_90',      label: 'Sharp Nose 90°' },
  { value: 'group_of_cylinders', label: 'Group of Cylinders' },
]

const BED_CONDITIONS = [
  { value: 'plane_bed_armored',      label: 'Plane Bed / Armored' },
  { value: 'clear_water',            label: 'Clear Water' },
  { value: 'small_dunes_h_lt_2m',    label: 'Small Dunes (H < 2m)' },
  { value: 'medium_dunes_h_2_to_5m', label: 'Medium Dunes (H 2–5m)' },
  { value: 'large_dunes_h_gt_5m',    label: 'Large Dunes (H > 5m)' },
]

const FOUNDATION_TYPES = [
  { value: 'pile_cap',     label: 'Pile Cap' },
  { value: 'spread_footing', label: 'Spread Footing' },
  { value: 'drilled_shaft', label: 'Drilled Shaft' },
]

const STEP_LABELS = [
  'Bridge Location',
  'PE Inputs',
  'Hydraulics',
  'HEC-18 Calculation',
  'Results',
]

const input = { background: '#111e36', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 4, padding: '9px 10px', fontSize: 12, width: '100%', boxSizing: 'border-box', minHeight: 44, outline: 'none' }
const label = { color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: 4, textTransform: 'uppercase' }

function RiskBadge({ risk }) {
  const colors = { CRITICAL: C.err, HIGH: '#f97316', MODERATE: C.warn, LOW: C.ok }
  const c = colors[risk] || C.muted
  return (
    <span style={{ background: c + '22', color: c, border: `1px solid ${c}44`, borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>
      {risk}
    </span>
  )
}

function GoNogoBadge({ value }) {
  const isGo = value === 'GO'
  return (
    <span style={{ background: (isGo ? C.ok : C.err) + '22', color: isGo ? C.ok : C.err, border: `1px solid ${(isGo ? C.ok : C.err)}55`, borderRadius: 6, padding: '6px 18px', fontSize: 16, fontWeight: 800, letterSpacing: '0.08em' }}>
      {value}
    </span>
  )
}

function KFactor({ label: lbl, value, desc }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
        <span style={{ color: C.muted, fontSize: 10, fontWeight: 700 }}>{lbl}</span>
        <span style={{ color: C.accent, fontSize: 16, fontWeight: 800 }}>{value}</span>
      </div>
      <div style={{ color: C.muted, fontSize: 10, lineHeight: 1.5 }}>{desc}</div>
    </div>
  )
}

export default function BridgeScour({ apiKey = 'sg_ent_demo' }) {
  const [step, setStep]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [gauge, setGauge]  = useState(null)

  const [form, setForm] = useState({
    lat:             '',
    lng:             '',
    pier_width_m:    '',
    pier_length_m:   '',
    flow_depth_m:    '',
    velocity_m_s:    '',
    pier_shape:      'round_nose',
    skew_deg:        '0',
    bed_condition:   'plane_bed_armored',
    d50_mm:          '0.5',
    d95_mm:          '1.0',
    foundation_type: 'pile_cap',
  })

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function canNext() {
    if (step === 0) return form.lat && form.lng
    if (step === 1) return form.pier_width_m && form.pier_length_m && form.pier_shape && form.foundation_type
    if (step === 2) return form.flow_depth_m && form.velocity_m_s
    return true
  }

  async function runCalculation() {
    setLoading(true)
    setError(null)
    try {
      const body = {
        lat:             parseFloat(form.lat),
        lng:             parseFloat(form.lng),
        pier_width_m:    parseFloat(form.pier_width_m),
        pier_length_m:   parseFloat(form.pier_length_m || form.pier_width_m),
        flow_depth_m:    parseFloat(form.flow_depth_m),
        velocity_m_s:    parseFloat(form.velocity_m_s),
        pier_shape:      form.pier_shape,
        skew_deg:        parseFloat(form.skew_deg || '0'),
        bed_condition:   form.bed_condition,
        d50_mm:          parseFloat(form.d50_mm),
        d95_mm:          parseFloat(form.d95_mm),
        foundation_type: form.foundation_type,
      }
      const res = await fetch(`${API}/api/hec18`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        setLoading(false)
        return
      }
      setResult(data.scour)
      setGauge(data.nearest_gauge)
      setStep(4)
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  function reset() {
    setStep(0); setResult(null); setGauge(null); setError(null)
    setForm({ lat:'', lng:'', pier_width_m:'', pier_length_m:'', flow_depth_m:'', velocity_m_s:'', pier_shape:'round_nose', skew_deg:'0', bed_condition:'plane_bed_armored', d50_mm:'0.5', d95_mm:'1.0', foundation_type:'pile_cap' })
  }

  function exportExcel() {
    if (!result) return
    const rows = [
      ['StormGrid HEC-18 Bridge Scour Report', '', ''],
      ['Generated', new Date().toLocaleString(), ''],
      ['', '', ''],
      ['INPUTS', '', ''],
      ['Latitude', form.lat, '°'],
      ['Longitude', form.lng, '°'],
      ['Pier Width', form.pier_width_m, 'm'],
      ['Pier Length', form.pier_length_m || form.pier_width_m, 'm'],
      ['Pier Shape', form.pier_shape, ''],
      ['Skew Angle', form.skew_deg, '°'],
      ['Flow Depth', form.flow_depth_m, 'm'],
      ['Velocity', form.velocity_m_s, 'm/s'],
      ['Bed Condition', form.bed_condition, ''],
      ['D50', form.d50_mm, 'mm'],
      ['D95', form.d95_mm, 'mm'],
      ['', '', ''],
      ['RESULTS', '', ''],
      ['Scour Depth', result.scour_depth_m, 'm'],
      ['Scour Depth', result.scour_depth_ft, 'ft'],
      ['Scour Condition', result.scour_condition, ''],
      ['Risk Classification', result.risk_classification, ''],
      ['Go/No-Go', result.go_nogo, ''],
      ['K1 (Shape)', result.K1, ''],
      ['K2 (Skew)', result.K2, ''],
      ['K3 (Bed)', result.K3, ''],
      ['K4 (Armoring)', result.K4, ''],
      ['Froude Number', result.froude_number, ''],
      ['Critical Velocity', result.critical_velocity_m_s, 'm/s'],
      ['Reference', result.reference, ''],
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `hec18_scour_report_${Date.now()}.csv`
    a.click()
  }

  function exportPdf() {
    if (!result) return
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>HEC-18 Bridge Scour Report</title>
<style>
  body { font-family: system-ui; padding: 48px; max-width: 800px; margin: 0 auto; color: #1e293b; }
  @media print { body { padding: 24px; } .no-print { display: none; } }
  h1 { font-size: 24px; color: #0a1628; border-bottom: 3px solid #06b6d4; padding-bottom: 16px; }
  h2 { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin: 24px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #64748b; padding: 0 0 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
  td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .big { font-size: 36px; font-weight: 800; color: #06b6d4; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 800; font-size: 14px; }
  .ok { background: #f0fdf4; color: #22c55e; border: 1px solid #22c55e; }
  .err { background: #fef2f2; color: #ef4444; border: 1px solid #ef4444; }
  .warn { background: #fffbeb; color: #f59e0b; border: 1px solid #f59e0b; }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #06b6d4; color: #0a1628; border: none; border-radius: 6px; padding: 10px 20px; font-weight: 800; cursor: pointer; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
<h1>StormGrid — HEC-18 Bridge Scour Report</h1>
<p style="color:#64748b;font-size:12px;">Photonic Dynamics Inc. · getstormgrid.com · Generated ${new Date().toLocaleString()}</p>
<h2>Summary</h2>
<div class="big">${result.scour_depth_m} m</div>
<div style="font-size:20px;color:#475569;margin-bottom:16px;">(${result.scour_depth_ft} ft)</div>
<div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
  <span class="badge ${result.go_nogo === 'GO' ? 'ok' : 'err'}">${result.go_nogo}</span>
  <span class="badge ${result.risk_classification === 'LOW' ? 'ok' : result.risk_classification === 'MODERATE' ? 'warn' : 'err'}">${result.risk_classification} RISK</span>
  <span class="badge" style="background:#f0f9ff;color:#0369a1;border:1px solid #0369a1;">${result.scour_condition.replace('_', '-').toUpperCase()}</span>
</div>
<h2>K-Factors (FHWA HEC-18 5th Ed. §5.2)</h2>
<table><thead><tr><th>Factor</th><th>Value</th><th>Meaning</th></tr></thead><tbody>
<tr><td>K1 — Nose shape</td><td>${result.K1}</td><td>Pier shape correction</td></tr>
<tr><td>K2 — Angle of attack</td><td>${result.K2}</td><td>Flow skew correction</td></tr>
<tr><td>K3 — Bed condition</td><td>${result.K3}</td><td>Bed-form amplification</td></tr>
<tr><td>K4 — Armoring</td><td>${result.K4}</td><td>Coarse-material reduction</td></tr>
<tr><td>Froude No. (Fr₁)</td><td>${result.froude_number}</td><td>V / √(g·y₁)</td></tr>
<tr><td>Critical velocity Vc</td><td>${result.critical_velocity_m_s} m/s</td><td>Scour initiation threshold</td></tr>
</tbody></table>
<h2>Inputs</h2>
<table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>
<tr><td>Location</td><td>${form.lat}° N, ${form.lng}° W</td></tr>
<tr><td>Pier Width (a)</td><td>${result.pier_width_m} m</td></tr>
<tr><td>Flow Depth (y₁)</td><td>${result.flow_depth_m} m</td></tr>
<tr><td>Velocity (V)</td><td>${result.velocity_m_s} m/s</td></tr>
<tr><td>Pier Shape</td><td>${form.pier_shape.replace(/_/g,' ')}</td></tr>
<tr><td>Skew Angle</td><td>${form.skew_deg}°</td></tr>
<tr><td>Bed Condition</td><td>${form.bed_condition.replace(/_/g,' ')}</td></tr>
<tr><td>D50</td><td>${form.d50_mm} mm</td></tr>
<tr><td>D95</td><td>${form.d95_mm} mm</td></tr>
</tbody></table>
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">
  <strong>${result.reference}</strong><br>
  CSU equation: ys/a = 2.0 × K1 × K2 × K3 × K4 × (a/y₁)^0.65 × Fr₁^0.43<br>
  ⚠ This report is for preliminary planning only. Final design requires a licensed engineer's stamp and certified field survey.
</div>
</body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Bridge Scour (HEC-18)</h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>FHWA HEC-18 5th Ed. pier scour — Enterprise/Municipal tier</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, overflow: 'hidden', borderRadius: 6, border: `1px solid ${C.border}` }}>
        {STEP_LABELS.map((lbl, i) => {
          const active  = i === step
          const done    = i < step
          return (
            <div
              key={i}
              onClick={() => done && setStep(i)}
              style={{ flex: 1, padding: '10px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', cursor: done ? 'pointer' : 'default', background: active ? C.accent : done ? C.accent + '22' : 'transparent', color: active ? '#0a1628' : done ? C.accent : C.muted, borderRight: i < STEP_LABELS.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.15s' }}
            >
              {done && !active ? '✓ ' : ''}{lbl}
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{ background: C.err + '18', border: `1px solid ${C.err}44`, borderRadius: 6, padding: '12px 16px', marginBottom: 16, color: C.err, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Step 0: Bridge Location */}
      {step === 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, maxWidth: 480 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>STEP 1 — BRIDGE LOCATION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={label}>Latitude (°N)</label>
              <input value={form.lat} onChange={e => set('lat', e.target.value)} type="number" step="0.0001" placeholder="30.3322" style={input} />
            </div>
            <div>
              <label style={label}>Longitude (°W)</label>
              <input value={form.lng} onChange={e => set('lng', e.target.value)} type="number" step="0.0001" placeholder="-81.6557" style={input} />
            </div>
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 20 }}>
            Nearest USGS stream gauge will be auto-detected within 50 km to pull hydraulic context data.
          </div>
          <button disabled={!canNext()} onClick={() => setStep(1)} style={{ background: canNext() ? C.accent : C.border, color: canNext() ? '#0a1628' : C.muted, border: 'none', borderRadius: 5, padding: '12px 24px', fontSize: 12, fontWeight: 800, cursor: canNext() ? 'pointer' : 'not-allowed', minHeight: 44 }}>
            Next: PE Inputs →
          </button>
        </div>
      )}

      {/* Step 1: PE Engineer Inputs */}
      {step === 1 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, maxWidth: 560 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>STEP 2 — PIER CHARACTERISTICS (PE Input)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={label}>Pier Width a (m)</label>
              <input value={form.pier_width_m} onChange={e => set('pier_width_m', e.target.value)} type="number" step="0.1" placeholder="1.5" style={input} />
            </div>
            <div>
              <label style={label}>Pier Length L (m)</label>
              <input value={form.pier_length_m} onChange={e => set('pier_length_m', e.target.value)} type="number" step="0.1" placeholder="8.0" style={input} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Pier Shape</label>
            <select value={form.pier_shape} onChange={e => set('pier_shape', e.target.value)} style={input}>
              {PIER_SHAPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={label}>Skew Angle θ (°)</label>
              <input value={form.skew_deg} onChange={e => set('skew_deg', e.target.value)} type="number" step="1" placeholder="0" style={input} />
            </div>
            <div>
              <label style={label}>Foundation Type</label>
              <select value={form.foundation_type} onChange={e => set('foundation_type', e.target.value)} style={input}>
                {FOUNDATION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={label}>D50 (mm)</label>
              <input value={form.d50_mm} onChange={e => set('d50_mm', e.target.value)} type="number" step="0.1" placeholder="0.5" style={input} />
            </div>
            <div>
              <label style={label}>D95 (mm)</label>
              <input value={form.d95_mm} onChange={e => set('d95_mm', e.target.value)} type="number" step="0.1" placeholder="1.0" style={input} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '12px 18px', fontSize: 12, cursor: 'pointer', minHeight: 44 }}>← Back</button>
            <button disabled={!canNext()} onClick={() => setStep(2)} style={{ background: canNext() ? C.accent : C.border, color: canNext() ? '#0a1628' : C.muted, border: 'none', borderRadius: 5, padding: '12px 24px', fontSize: 12, fontWeight: 800, cursor: canNext() ? 'pointer' : 'not-allowed', flex: 1, minHeight: 44 }}>
              Next: Hydraulics →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Hydraulics */}
      {step === 2 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, maxWidth: 480 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>STEP 3 — HYDRAULIC CONDITIONS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={label}>Flow Depth y₁ (m)</label>
              <input value={form.flow_depth_m} onChange={e => set('flow_depth_m', e.target.value)} type="number" step="0.1" placeholder="3.5" style={input} />
            </div>
            <div>
              <label style={label}>Velocity V (m/s)</label>
              <input value={form.velocity_m_s} onChange={e => set('velocity_m_s', e.target.value)} type="number" step="0.01" placeholder="1.2" style={input} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Bed Condition</label>
            <select value={form.bed_condition} onChange={e => set('bed_condition', e.target.value)} style={input}>
              {BED_CONDITIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {form.flow_depth_m && form.velocity_m_s && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                ['Froude No.', (parseFloat(form.velocity_m_s) / Math.sqrt(9.81 * parseFloat(form.flow_depth_m))).toFixed(3)],
                ['Unit Discharge', (parseFloat(form.velocity_m_s) * parseFloat(form.flow_depth_m)).toFixed(2) + ' m²/s'],
                ['V²/(2g)', (Math.pow(parseFloat(form.velocity_m_s), 2) / (2 * 9.81)).toFixed(3) + ' m'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ color: C.muted, fontSize: 9, fontWeight: 700 }}>{k}</div>
                  <div style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '12px 18px', fontSize: 12, cursor: 'pointer', minHeight: 44 }}>← Back</button>
            <button disabled={!canNext()} onClick={() => setStep(3)} style={{ background: canNext() ? C.accent : C.border, color: canNext() ? '#0a1628' : C.muted, border: 'none', borderRadius: 5, padding: '12px 24px', fontSize: 12, fontWeight: 800, cursor: canNext() ? 'pointer' : 'not-allowed', flex: 1, minHeight: 44 }}>
              Next: Calculate →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review + Calculate */}
      {step === 3 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, maxWidth: 520 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>STEP 4 — REVIEW INPUTS & CALCULATE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 20 }}>
            {[
              ['Location', `${form.lat}° N, ${form.lng}° W`],
              ['Pier Width', `${form.pier_width_m} m`],
              ['Pier Length', `${form.pier_length_m || form.pier_width_m} m`],
              ['Pier Shape', form.pier_shape.replace(/_/g, ' ')],
              ['Skew', `${form.skew_deg}°`],
              ['Flow Depth', `${form.flow_depth_m} m`],
              ['Velocity', `${form.velocity_m_s} m/s`],
              ['Bed Condition', form.bed_condition.replace(/_/g, ' ')],
              ['D50 / D95', `${form.d50_mm} / ${form.d95_mm} mm`],
              ['Foundation', form.foundation_type.replace(/_/g, ' ')],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: C.muted, fontSize: 11 }}>{k}</span>
                <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600, textAlign: 'right', textTransform: 'capitalize' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '12px 18px', fontSize: 12, cursor: 'pointer', minHeight: 44 }}>← Back</button>
            <button
              disabled={loading}
              onClick={runCalculation}
              style={{ background: loading ? C.border : C.accent, color: loading ? C.muted : '#0a1628', border: 'none', borderRadius: 5, padding: '12px 24px', fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', flex: 1, minHeight: 44 }}
            >
              {loading ? 'Calculating…' : '▶ Run HEC-18 Calculation'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && result && (
        <div>
          {/* Main result card */}
          <div style={{ background: C.card, border: `1px solid ${result.go_nogo === 'GO' ? C.ok : C.err}55`, borderRadius: 8, padding: 24, marginBottom: 16 }}>
            <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>STEP 5 — HEC-18 RESULTS</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>TOTAL SCOUR DEPTH</div>
                <div style={{ color: C.accent, fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{result.scour_depth_m}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>meters ({result.scour_depth_ft} ft)</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <GoNogoBadge value={result.go_nogo} />
                <RiskBadge risk={result.risk_classification} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', fontSize: 11, color: '#e2e8f0' }}>
                {result.scour_condition === 'live_bed' ? '🌊 Live-bed scour' : '⚓ Clear-water scour'}
              </span>
              <span style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', fontSize: 11, color: '#e2e8f0' }}>
                Fr₁ = {result.froude_number}
              </span>
              <span style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', fontSize: 11, color: '#e2e8f0' }}>
                Vc = {result.critical_velocity_m_s} m/s
              </span>
            </div>

            {/* K factors */}
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>K-FACTORS (CSU EQUATION)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
              <KFactor label="K1 — Nose Shape" value={result.K1} desc={`Pier shape: ${form.pier_shape.replace(/_/g,' ')}`} />
              <KFactor label="K2 — Angle of Attack" value={result.K2} desc={`Skew: ${form.skew_deg}° · L/a ratio applied`} />
              <KFactor label="K3 — Bed Condition" value={result.K3} desc={form.bed_condition.replace(/_/g,' ')} />
              <KFactor label="K4 — Armoring" value={result.K4} desc={`D50=${form.d50_mm}mm · ${result.K4 < 1 ? 'armoring reduces scour' : 'no armoring reduction'}`} />
            </div>

            <div style={{ background: '#0a1628', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontFamily: 'monospace', fontSize: 11, color: C.muted }}>
              <span style={{ color: C.accent }}>ys/a</span> = 2.0 × {result.K1} × {result.K2} × {result.K3} × {result.K4} × (a/y₁)^0.65 × Fr₁^0.43<br />
              = 2.0 × {result.K1} × {result.K2} × {result.K3} × {result.K4} × ({result.pier_width_m}/{result.flow_depth_m})^0.65 × {result.froude_number}^0.43<br />
              <span style={{ color: C.accent }}>ys = {result.scour_depth_m} m</span>
            </div>

            {gauge?.site_no && (
              <div style={{ background: '#0a1628', border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, marginBottom: 6 }}>NEAREST USGS GAUGE</div>
                <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{gauge.name}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>Site {gauge.site_no} · {gauge.dist_km} km away · {gauge.lat?.toFixed(4)}° N, {gauge.lng?.toFixed(4)}° W</div>
              </div>
            )}

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, color: C.warn, fontSize: 10, lineHeight: 1.65, marginBottom: 16 }}>
              ⚠ Ref: {result.reference}. This report is for preliminary planning only. Final design requires review and stamp by a licensed PE. Field survey and site-specific hydraulic analysis required for official submission.
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={exportExcel} style={{ background: C.ok + '18', color: C.ok, border: `1px solid ${C.ok}44`, borderRadius: 5, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
                ↓ Export CSV
              </button>
              <button onClick={exportPdf} style={{ background: C.warn + '18', color: C.warn, border: `1px solid ${C.warn}44`, borderRadius: 5, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
                ↓ Export PDF Report
              </button>
              <button onClick={reset} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 18px', fontSize: 12, cursor: 'pointer', minHeight: 44, marginLeft: 'auto' }}>
                New Calculation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
