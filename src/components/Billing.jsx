import { useEffect, useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { query } from '../lib/supabase'

const C = { card: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' }

const TIERS = [
  {
    id: 'professional',
    name: 'Professional',
    price: '$1,500',
    period: '/mo',
    color: C.accent,
    features: [
      'Jackson Lambda Model (Λ) per run',
      'Full 9-adapter live data stack',
      'USGS 3DEP elevation + gradient',
      'NOAA MRMS precipitation',
      'SSURGO soil permeability',
      'USGS NWIS stream gauges',
      'FEMA NFHL flood zone risk flag',
      'Storm surge index + regime',
      'SMAP soil moisture + Sentinel SAR',
      '16 Florida locations',
      'CSV export',
    ],
    cta: 'Start Professional',
    priceId: 'price_1TahCoRuUuWdb6lUY9xnafWe',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$5,000',
    period: '/mo',
    color: '#a78bfa',
    highlight: true,
    features: [
      'Everything in Professional',
      'PINN flood depth simulation',
      'HEC-RAS hydraulic model outputs',
      'Spatial Lambda GeoTIFF heatmap',
      'Full FEMA zone GeoJSON + bbox',
      'Dynamic JLM v2.0 time-stepping',
      'All Supabase Storage URLs',
      'CSI / POD / FAR skill metrics',
      'Priority API access',
      'Dedicated onboarding',
    ],
    cta: 'Contact Sales',
    priceId: 'price_1TahFqRuUuWdb6lUru9epYfY',
  },
  {
    id: 'municipal',
    name: 'Municipal',
    price: '$10,000',
    period: '/event',
    color: C.ok,
    features: [
      'Everything in Enterprise',
      'Live PINN monitoring during active storm events',
      'Real-time Lambda dashboard feed',
      'Per-event rapid-response pricing',
      'Emergency 24-hr SLA',
      'Priority processing queue',
      'Dedicated account manager',
      'Custom bbox + location support',
      'White-label output',
    ],
    cta: 'Contact Sales',
    priceId: 'price_1TahKtRuUuWdb6lUXYn3Em7M',
  },
]

export default function Billing() {
  const isMobile = useIsMobile()
  const [clients, setClients]   = useState([])
  const [runs, setRuns]         = useState([])
  const [apiKeys, setApiKeys]   = useState([])

  useEffect(() => {
    query('clients',  { order: 'created_at', limit: 10  }).then(setClients)
    query('runs',     { order: 'created_at', limit: 200 }).then(setRuns)
    query('api_keys', { order: 'created_at', limit: 10  }).then(setApiKeys)
  }, [])

  const activeClient  = clients[0]
  const activeTier    = activeClient?.tier || null
  const activeKey     = apiKeys.find(k => k.active)
  const runsThisMonth = runs.filter(r => {
    if (!r.created_at) return false
    const d = new Date(r.created_at), now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Billing</h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Subscription tiers and API key management</p>
      </div>

      {activeClient && (
        <div style={{ background: C.card, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>CURRENT PLAN</div>
          <div style={{ display: 'flex', gap: isMobile ? 16 : 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: C.muted, fontSize: 10 }}>Tier</div>
              <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, textTransform: 'capitalize', marginTop: 2 }}>{activeClient.tier || '—'}</div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: 10 }}>Status</div>
              <div style={{ color: activeClient.status === 'active' ? C.ok : C.warn, fontSize: 16, fontWeight: 700, textTransform: 'capitalize', marginTop: 2 }}>{activeClient.status || '—'}</div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: 10 }}>Runs This Month</div>
              <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginTop: 2 }}>{runsThisMonth}</div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: 10 }}>API Key</div>
              <div style={{ color: activeKey ? C.ok : C.muted, fontSize: 13, fontFamily: 'monospace', marginTop: 2 }}>{activeKey ? `${activeKey.api_key?.slice(0, 16)}...` : 'None'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tier cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        {TIERS.map(tier => {
          const isCurrent = activeTier === tier.id
          return (
            <div key={tier.id} style={{ background: C.card, border: `1px solid ${isCurrent ? tier.color : tier.highlight ? tier.color + '44' : C.border}`, borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {tier.highlight && (
                <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: tier.color, color: '#0a1628', fontSize: 10, fontWeight: 800, padding: '2px 16px', borderRadius: '0 0 6px 6px', letterSpacing: '0.05em' }}>
                  MOST POPULAR
                </div>
              )}
              {isCurrent && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: tier.color + '22', color: tier.color, border: `1px solid ${tier.color}44`, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>CURRENT</div>
              )}
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: tier.color, fontWeight: 700, fontSize: 13 }}>{tier.name}</span>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 800 }}>{tier.price}</span>
                <span style={{ color: C.muted, fontSize: 13 }}>{tier.period}</span>
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                {tier.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: tier.color, fontSize: 12, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span style={{ color: '#e2e8f0', fontSize: 12 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button style={{ background: isCurrent ? tier.color + '22' : tier.color, color: isCurrent ? tier.color : '#0a1628', border: `1px solid ${tier.color}`, borderRadius: 4, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                {isCurrent ? 'Current Plan' : tier.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* Demo keys info */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>DEMO API KEYS</div>
        <p style={{ color: C.muted, fontSize: 12, margin: '0 0 16px' }}>These keys are always active and give access to respective tier outputs for evaluation.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'sg_pro_demo', tier: 'Professional', color: C.accent },
            { key: 'sg_ent_demo', tier: 'Enterprise',   color: '#a78bfa' },
            { key: 'sg_mun_demo', tier: 'Municipal',    color: C.ok },
          ].map(k => (
            <div key={k.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a1628', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 16px', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: k.color, fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{k.key}</span>
              <span style={{ color: C.muted, fontSize: 11 }}>{k.tier} tier</span>
            </div>
          ))}
        </div>
        <p style={{ color: C.muted, fontSize: 11, margin: '14px 0 0' }}>
          Header: <code style={{ background: '#0a1628', padding: '2px 6px', borderRadius: 3, color: C.accent }}>X-API-Key: sg_ent_demo</code>
        </p>
      </div>
    </div>
  )
}
