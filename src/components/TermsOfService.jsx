const C = {
  bg: '#050e1c', nav: '#0a1628', card: '#0d1f3c', border: '#1e3a5f',
  accent: '#06b6d4', muted: '#64748b',
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

const SECTIONS = [
  {
    title: 'Governing Law',
    body: 'This agreement is governed by the laws of the State of Florida. Any disputes shall be resolved in Duval County, Florida.',
  },
  {
    title: 'Limitation of Liability',
    body: "Photonic Dynamics Inc.'s total liability to any user shall not exceed the total subscription fees paid in the 30 days prior to the claim. Photonic Dynamics is not liable for any indirect, incidental, or consequential damages.",
  },
  {
    title: 'Acceptable Use',
    body: 'Users may not reverse engineer, resell, sublicense, or redistribute StormGrid outputs or data without written permission from Photonic Dynamics Inc.',
  },
  {
    title: 'Intellectual Property',
    body: 'The Jackson Lambda Model, Jackson Vortex Term, all StormGrid outputs, algorithms, and platform architecture are the exclusive intellectual property of Photonic Dynamics Inc. No use of these assets is permitted outside the scope of an active subscription.',
  },
  {
    title: 'Dispute Resolution',
    body: 'Any disputes arising from use of StormGrid shall first be submitted to binding arbitration under the American Arbitration Association rules before any litigation may be pursued.',
  },
  {
    title: 'Effective Date',
    body: 'These Terms of Service are effective as of June 3, 2026.',
  },
]

export default function TermsOfService() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      <nav style={{ background: C.nav, borderBottom: `1px solid ${C.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, height: 56 }}>
        <a href="/" style={{ textDecoration: 'none' }}><Logo /></a>
        <a href="/" style={{ color: C.muted, fontSize: 12, textDecoration: 'none' }}>← Back to Home</a>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px 96px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: '#f1f5f9', marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 56 }}>Photonic Dynamics Inc. · getstormgrid.com</p>

        {SECTIONS.map(s => (
          <div key={s.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '28px 32px', marginBottom: 20 }}>
            <h2 style={{ color: C.accent, fontSize: 14, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>{s.title}</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </main>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '24px', textAlign: 'center', color: C.muted, fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Logo />
        </div>
        <div>© {new Date().getFullYear()} Photonic Dynamics Inc. · <a href="mailto:jacksoncaleb70@gmail.com" style={{ color: C.accent, textDecoration: 'none' }}>jacksoncaleb70@gmail.com</a></div>
      </footer>
    </div>
  )
}
