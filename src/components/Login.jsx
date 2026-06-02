import { useState } from 'react'

const API = 'https://api.getstormgrid.com'
const C = { bg: '#050e1c', card: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', ok: '#22c55e', err: '#ef4444' }

const DEMO_KEYS = [
  { key: 'sg_pro_demo', tier: 'Professional', color: C.accent },
  { key: 'sg_ent_demo', tier: 'Enterprise',   color: '#a78bfa' },
  { key: 'sg_mun_demo', tier: 'Municipal',    color: C.ok },
]

export default function Login({ onLogin }) {
  const [apiKey, setApiKey]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleLogin(overrideKey) {
    const k = (overrideKey || apiKey).trim()
    if (!k) { setError('Enter an API key'); return }
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/api/validate-key`, { headers: { 'X-API-Key': k } })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid key'); return }
      localStorage.setItem('sg_api_key',  k)
      localStorage.setItem('sg_api_tier', data.tier)
      onLogin(k, data.tier)
    } catch {
      setError('Could not reach API — check your connection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: C.accent + '22', border: `1px solid ${C.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke={C.accent} strokeWidth="1.5" fill="none" />
              <circle cx="7" cy="7" r="2" fill={C.accent} />
            </svg>
          </div>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>StormGrid</div>
            <div style={{ color: C.muted, fontSize: 11 }}>Photonic Dynamics Inc.</div>
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 32 }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Access Dashboard</h2>
          <p style={{ color: C.muted, fontSize: 12, margin: '0 0 24px', lineHeight: 1.6 }}>
            Enter your API key to continue. To purchase access, visit the&nbsp;
            <a href="#plans" onClick={e => { e.preventDefault(); onLogin('_billing') }} style={{ color: C.accent, textDecoration: 'none' }}>plans page</a>.
          </p>

          <label style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>API KEY</label>
          <input
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="sg_ent_..."
            autoFocus
            style={{ width: '100%', background: '#111e36', color: '#e2e8f0', border: `1px solid ${error ? C.err : C.border}`, borderRadius: 4, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: error ? 8 : 16, outline: 'none' }}
          />
          {error && <div style={{ color: C.err, fontSize: 11, marginBottom: 12 }}>{error}</div>}

          <button
            onClick={() => handleLogin()}
            disabled={loading}
            style={{ width: '100%', background: loading ? '#1e3a5f' : C.accent, color: loading ? C.muted : '#0a1628', border: 'none', borderRadius: 4, padding: '11px', fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', marginBottom: 24 }}
          >
            {loading ? 'VALIDATING...' : 'ACCESS DASHBOARD →'}
          </button>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>TRY WITH A DEMO KEY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_KEYS.map(d => (
                <button
                  key={d.key}
                  onClick={() => { setApiKey(d.key); handleLogin(d.key) }}
                  disabled={loading}
                  style={{ background: '#0a1628', border: `1px solid ${C.border}`, borderRadius: 4, padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
                >
                  <span style={{ color: d.color, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{d.key}</span>
                  <span style={{ color: C.muted, fontSize: 10 }}>{d.tier} tier</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          Questions? <a href="mailto:jacksoncaleb70@gmail.com" style={{ color: C.accent, textDecoration: 'none' }}>jacksoncaleb70@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
