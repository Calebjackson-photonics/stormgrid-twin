import { useState } from 'react'
import { useIsMobile } from './hooks/useIsMobile'
import Login from './components/Login'
import MapDashboard from './components/MapDashboard'
import DataQuery from './components/DataQuery'
import AdapterHealth from './components/AdapterHealth'
import Reports from './components/Reports'
import Billing from './components/Billing'

const TABS = [
  { id: 'query',    label: 'Data Query' },
  { id: 'adapters', label: 'Adapter Health' },
  { id: 'reports',  label: 'Reports' },
  { id: 'billing',  label: 'Billing' },
]

const TIER_COLOR = { professional: '#06b6d4', enterprise: '#a78bfa', municipal: '#22c55e' }

const C = { bg: '#0a1628', nav: '#0d1f3c', border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b' }

function loadSession() {
  return {
    key:  localStorage.getItem('sg_api_key')  || '',
    tier: localStorage.getItem('sg_api_tier') || '',
  }
}

export default function App() {
  const [session, setSession]       = useState(loadSession)
  const [activeTab, setActiveTab]   = useState(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const isMobile = useIsMobile()

  function handleLogin(key, tier) {
    // '_billing' is a sentinel — skip auth, go straight to billing tab
    if (key === '_billing') { setSession({ key: '', tier: '' }); setActiveTab('billing'); return }
    setSession({ key, tier })
    setActiveTab(null)
  }

  function handleLogout() {
    localStorage.removeItem('sg_api_key')
    localStorage.removeItem('sg_api_tier')
    setSession({ key: '', tier: '' })
    setActiveTab(null)
  }

  const isLoggedIn  = Boolean(session.key)
  const tierColor   = TIER_COLOR[session.tier] || C.accent
  const currentLabel = activeTab ? TABS.find(t => t.id === activeTab)?.label : 'Map'

  if (!isLoggedIn && activeTab !== 'billing') {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <nav style={{ background: C.nav, borderBottom: `1px solid ${C.border}`, padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center', gap: 0, position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
        {/* Logo */}
        <div
          onClick={() => { setActiveTab(null); setMenuOpen(false) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: isMobile ? 12 : 32, borderRight: `1px solid ${C.border}`, marginRight: isMobile ? 4 : 8, flexShrink: 0, cursor: 'pointer' }}
        >
          <div style={{ width: 26, height: 26, borderRadius: 6, background: C.accent + '22', border: `1px solid ${C.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke={C.accent} strokeWidth="1.5" fill="none" />
              <circle cx="7" cy="7" r="2" fill={C.accent} />
            </svg>
          </div>
          <span style={{ color: '#e2e8f0', fontWeight: 800, fontSize: isMobile ? 13 : 14, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>StormGrid</span>
        </div>

        {isMobile ? (
          <>
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.accent, fontSize: 12, fontWeight: 700, paddingLeft: 4 }}>
              {currentLabel}
            </div>
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: '#e2e8f0', padding: '6px 10px', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }} aria-label="Menu">
              {menuOpen ? '✕' : '☰'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? C.accent : 'transparent'}`, color: activeTab === tab.id ? C.accent : C.muted, padding: '16px 18px', fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s, border-color 0.15s', letterSpacing: '0.01em' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tier badge + logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 16, flexShrink: 0 }}>
              {isLoggedIn && session.tier && (
                <span style={{ background: tierColor + '22', color: tierColor, border: `1px solid ${tierColor}44`, borderRadius: 4, fontSize: 10, fontWeight: 800, padding: '3px 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {session.tier}
                </span>
              )}
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ color: C.muted, fontSize: 11 }}>api.getstormgrid.com</span>
              {isLoggedIn && (
                <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                  Logout
                </button>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Mobile dropdown */}
      {isMobile && menuOpen && (
        <div style={{ background: C.nav, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 45, zIndex: 99 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMenuOpen(false) }} style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: activeTab === tab.id ? C.accent : '#e2e8f0', padding: '14px 16px', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400, cursor: 'pointer', textAlign: 'left' }}>
              {tab.label}
            </button>
          ))}
          {isLoggedIn && (
            <button onClick={() => { handleLogout(); setMenuOpen(false) }} style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', color: C.muted, padding: '14px 16px', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
              Logout
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {activeTab === null ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MapDashboard apiKey={session.key} />
        </div>
      ) : (
        <main style={{ padding: isMobile ? '16px 12px' : '28px 24px', maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {activeTab === 'query'    && <DataQuery    apiKey={session.key} />}
          {activeTab === 'adapters' && <AdapterHealth />}
          {activeTab === 'reports'  && <Reports />}
          {activeTab === 'billing'  && <Billing />}
        </main>
      )}
    </div>
  )
}
