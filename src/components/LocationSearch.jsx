import { useEffect, useRef, useState } from 'react'

const API = 'https://api.getstormgrid.com'

const C = { border: '#1e3a5f', accent: '#06b6d4', muted: '#64748b', card: '#0d1f3c', bg: '#0a1628' }

const FL_CITIES = [
  'jacksonville', 'miami', 'tampa', 'orlando', 'fort_lauderdale',
  'sarasota', 'pensacola', 'gainesville', 'tallahassee', 'daytona_beach',
  'fort_myers', 'key_west', 'panama_city', 'ocala', 'saint_augustine', 'port_st_lucie',
]

function cityLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function LocationSearch({ value, onChange, inputStyle = {}, label = 'LOCATION' }) {
  const [text, setText]             = useState(value || '')
  const [suggestions, setSugg]      = useState([])
  const [searching, setSearching]   = useState(false)
  const [open, setOpen]             = useState(false)
  const debounce = useRef(null)
  const wrapRef  = useRef(null)

  // Sync if parent changes value externally
  useEffect(() => {
    if (value && value !== text) setText(cityLabel(value).replace(/_/g, ' '))
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleChange(e) {
    const v = e.target.value
    setText(v)
    setOpen(true)
    clearTimeout(debounce.current)
    if (v.trim().length < 2) { setSugg([]); return }
    debounce.current = setTimeout(() => geocode(v.trim()), 380)
  }

  async function geocode(q) {
    setSearching(true)
    try {
      const res = await fetch(`${API}/api/geocode?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const d = await res.json()
        setSugg(d.results || [])
      }
    } catch {}
    setSearching(false)
  }

  function selectSuggestion(item) {
    setText(item.title)
    setSugg([])
    setOpen(false)
    onChange(item.title, item.bbox)
  }

  function selectCity(key) {
    setText(cityLabel(key))
    setSugg([])
    setOpen(false)
    onChange(key, null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); setSugg([]) }
    if (e.key === 'Enter' && suggestions.length > 0) selectSuggestion(suggestions[0])
  }

  const base = {
    background: '#111e36', color: '#e2e8f0',
    border: `1px solid ${C.border}`, borderRadius: 4,
    padding: '7px 10px', fontSize: 12, width: '100%',
    boxSizing: 'border-box', outline: 'none',
    ...inputStyle,
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Text input */}
      <div style={{ position: 'relative' }}>
        <input
          value={text}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Type any city or address…"
          autoComplete="off"
          style={base}
        />
        {searching && (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 10 }}>
            …
          </span>
        )}
        {text && (
          <button
            onClick={() => { setText(''); setSugg([]); onChange('', null) }}
            style={{ position: 'absolute', right: searching ? 22 : 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 4px' }}
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>

      {/* Geocode suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: C.card, border: `1px solid ${C.border}`, borderRadius: '0 0 6px 6px', boxShadow: '0 8px 24px #00000055', maxHeight: 220, overflowY: 'auto' }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => selectSuggestion(s)}
              style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}22` : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e3a5f'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{s.title}</div>
              {s.address && s.address !== s.title && (
                <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{s.address}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FL city quick-select chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {FL_CITIES.map(key => (
          <button
            key={key}
            onMouseDown={() => selectCity(key)}
            style={{
              background: (value === key || text.toLowerCase() === cityLabel(key).toLowerCase()) ? C.accent + '33' : 'transparent',
              color: (value === key || text.toLowerCase() === cityLabel(key).toLowerCase()) ? C.accent : C.muted,
              border: `1px solid ${(value === key || text.toLowerCase() === cityLabel(key).toLowerCase()) ? C.accent + '66' : C.border}`,
              borderRadius: 3, padding: '3px 7px', fontSize: 10, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {cityLabel(key)}
          </button>
        ))}
      </div>
    </div>
  )
}
