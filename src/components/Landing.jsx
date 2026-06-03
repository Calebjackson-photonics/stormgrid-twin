const APP = 'https://app.getstormgrid.com'

const C = {
  bg: '#050e1c', nav: '#0a1628', card: '#0d1f3c', border: '#1e3a5f',
  accent: '#06b6d4', muted: '#64748b', ok: '#22c55e',
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 7, background: C.accent + '22', border: `1px solid ${C.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke={C.accent} strokeWidth="1.5" fill="none" />
          <circle cx="7" cy="7" r="2" fill={C.accent} />
        </svg>
      </div>
      <span style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>StormGrid</span>
    </div>
  )
}

const FEATURES = [
  {
    icon: '⬡',
    title: 'Jackson Lambda Model',
    desc: 'Proprietary dimensionless flood index — Λ = (elevation × precip) / (soil permeability × channel width). Validated against Irma 2017 and Matthew 2016.',
  },
  {
    icon: '⬡',
    title: '12-Layer Data Pipeline',
    desc: 'USGS 3DEP elevation, MRMS QPE precipitation, SSURGO soil science, FEMA NFHL flood zones, NOAA storm surge, SMAP soil moisture, Sentinel-1 SAR.',
  },
  {
    icon: '⬡',
    title: 'Spatial Lambda Heatmaps',
    desc: '256×256 raster grids with urban, directional, and coastal adjustments. GeoJSON and GeoTIFF outputs with SHA-256 provenance.',
  },
  {
    icon: '⬡',
    title: 'Real-Time API',
    desc: 'REST API at api.getstormgrid.com — POST /run launches a full pipeline. Poll /status, retrieve /outputs. Stripe-provisioned keys per tier.',
  },
  {
    icon: '⬡',
    title: 'Storm Comparison',
    desc: 'Side-by-side dual Mapbox GL maps with synced zoom and pan. Compare any two storms on the same Lambda color scale. Export CSV.',
  },
  {
    icon: '⬡',
    title: 'Supabase Audit Trail',
    desc: 'Every run writes to stormgrid_runs with full provenance JSON. Downloadable GeoTIFF, GeoJSON, and branded PDF report per run.',
  },
]

const TIERS = [
  {
    name: 'Professional',
    price: '$1,500',
    period: '/mo',
    color: C.accent,
    features: ['API access', '50 runs/month', 'GeoJSON + GeoTIFF outputs', 'Provenance reports', 'Email support'],
  },
  {
    name: 'Enterprise',
    price: '$5,000',
    period: '/mo',
    color: '#a78bfa',
    highlight: true,
    features: ['Unlimited runs', '6-hr time-stepping JLM', 'Full adapter stack', 'Storm comparison', 'Dedicated support'],
  },
  {
    name: 'Municipal',
    price: '$10,000',
    period: '/event',
    color: C.ok,
    features: ['Emergency-event pricing', 'Full pipeline access', 'GIS deliverables', 'Priority queue', 'Direct analyst access'],
  },
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Nav */}
      <nav style={{ background: C.nav, borderBottom: `1px solid ${C.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, height: 56 }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="#features" style={{ color: C.muted, fontSize: 12, textDecoration: 'none' }}>Features</a>
          <a href="#pricing" style={{ color: C.muted, fontSize: 12, textDecoration: 'none' }}>Pricing</a>
          <a href={APP} style={{ background: C.accent, color: '#0a1628', borderRadius: 5, padding: '7px 16px', fontSize: 12, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.03em' }}>
            Open App →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 920, margin: '0 auto', padding: '96px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.accent + '18', border: `1px solid ${C.accent}33`, borderRadius: 20, padding: '4px 14px', marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok, display: 'inline-block', boxShadow: `0 0 6px ${C.ok}` }} />
          <span style={{ color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>LIVE — api.getstormgrid.com</span>
        </div>

        <h1 style={{ fontSize: 'clamp(32px, 6vw, 58px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#f1f5f9', marginBottom: 24 }}>
          Automated Flood<br />
          <span style={{ color: C.accent }}>Intelligence</span>
        </h1>

        <p style={{ fontSize: 17, color: '#94a3b8', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
          StormGrid combines satellite data, soil science, and the proprietary Jackson Lambda Model to deliver real-time flood risk assessments for any Florida city.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={APP} style={{ background: C.accent, color: '#0a1628', borderRadius: 7, padding: '14px 32px', fontSize: 14, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.03em', display: 'inline-block' }}>
            Launch Dashboard →
          </a>
          <a href={`${APP}#demo`} style={{ background: 'transparent', color: '#e2e8f0', border: `1px solid ${C.border}`, borderRadius: 7, padding: '14px 28px', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
            Try Demo Key
          </a>
        </div>

        {/* Ground truth badges */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
          {[
            { storm: 'Hurricane Irma 2017', lambda: '0.0659', regime: 'RADIATIVE ✓' },
            { storm: 'Hurricane Matthew 2016', lambda: '0.0401', regime: 'RADIATIVE ✓' },
          ].map(v => (
            <div key={v.storm} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 18px', display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>{v.storm.toUpperCase()}</div>
                <div style={{ color: C.accent, fontSize: 18, fontWeight: 800, marginTop: 2 }}>Λ = {v.lambda}</div>
              </div>
              <span style={{ background: C.ok + '22', color: C.ok, border: `1px solid ${C.ok}44`, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px' }}>{v.regime}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, color: '#f1f5f9' }}>Built on Real Science</h2>
        <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, marginBottom: 48 }}>Every layer is a live data source — no static models, no stale outputs.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
              <div style={{ color: C.accent, fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{f.title}</div>
              <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, color: '#f1f5f9' }}>Pricing</h2>
        <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, marginBottom: 48 }}>Subscription access provisioned via Stripe. Keys delivered instantly.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {TIERS.map(t => (
            <div key={t.name} style={{ background: t.highlight ? C.card : '#0a1628', border: `2px solid ${t.highlight ? t.color : C.border}`, borderRadius: 12, padding: '28px 24px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {t.highlight && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: t.color, color: '#0a1628', borderRadius: 20, padding: '3px 12px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ color: t.color, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{t.name.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ color: '#f1f5f9', fontSize: 32, fontWeight: 900 }}>{t.price}</span>
                <span style={{ color: C.muted, fontSize: 12 }}>{t.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
                {t.features.map(feat => (
                  <li key={feat} style={{ color: '#94a3b8', fontSize: 13, padding: '5px 0', display: 'flex', gap: 8 }}>
                    <span style={{ color: t.color }}>✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
              <a
                href={APP}
                style={{ background: t.color, color: '#0a1628', borderRadius: 6, padding: '11px', fontSize: 13, fontWeight: 800, textDecoration: 'none', textAlign: 'center', display: 'block', letterSpacing: '0.03em' }}
              >
                Get Started →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '64px 24px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12, color: '#f1f5f9' }}>Ready to analyze flood risk?</h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>Start with a demo key — no signup required. Full pipeline runs in under 60 seconds.</p>
        <a href={APP} style={{ background: C.accent, color: '#0a1628', borderRadius: 7, padding: '15px 36px', fontSize: 15, fontWeight: 800, textDecoration: 'none', display: 'inline-block', letterSpacing: '0.03em' }}>
          Open StormGrid App →
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '24px', textAlign: 'center', color: C.muted, fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Logo />
        </div>
        <div>© {new Date().getFullYear()} Photonic Dynamics Inc. · <a href="mailto:jacksoncaleb70@gmail.com" style={{ color: C.accent, textDecoration: 'none' }}>jacksoncaleb70@gmail.com</a> · <a href="/terms" style={{ color: C.accent, textDecoration: 'none' }}>Terms of Service</a></div>
      </footer>
    </div>
  )
}
