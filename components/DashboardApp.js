'use client'
import { useState, useEffect } from 'react'

// ─── Responsive hook ──────────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(1200)
  useEffect(() => {
    setWidth(window.innerWidth)
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardApp({ venues }) {
  const [mode, setMode] = useState('venue')
  const [venueStats, setVenueStats] = useState({})
  const [selectedVenueId, setSelectedVenueId] = useState(null)
  const [venueDetail, setVenueDetail] = useState([])
  const [categoryNames, setCategoryNames] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [crossData, setCrossData] = useState(null)
  const [loading, setLoading] = useState(false)
  const w = useWindowWidth()
  const isMobile = w < 640
  const isTablet = w >= 640 && w < 1024

  useEffect(() => {
    fetch('/api/venue-stats')
      .then(r => r.json())
      .then(data => {
        const map = {}
        data.forEach(s => { map[s.id] = s })
        setVenueStats(map)
      })
    fetch('/api/category-names')
      .then(r => r.json())
      .then(setCategoryNames)
  }, [])

  const handleSelectVenue = async (id) => {
    if (selectedVenueId === id) { setSelectedVenueId(null); setVenueDetail([]); return }
    setSelectedVenueId(id)
    setLoading(true)
    const res = await fetch(`/api/categories?venue_id=${id}`)
    const data = await res.json()
    setVenueDetail(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const handleSelectCategory = async (name) => {
    if (selectedCategory === name) { setSelectedCategory(null); setCrossData(null); return }
    setSelectedCategory(name)
    setLoading(true)
    const res = await fetch(`/api/cross-venue?category=${encodeURIComponent(name)}`)
    const data = await res.json()
    setCrossData(data)
    setLoading(false)
  }

  const switchMode = (m) => {
    setMode(m)
    setSelectedVenueId(null)
    setVenueDetail([])
    setSelectedCategory(null)
    setCrossData(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>

      {/* Mode toggle bar */}
      <div style={{
        padding: isMobile ? '10px 16px' : '14px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 8,
      }}>
        {['venue', 'category'].map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              background: mode === m ? 'var(--gold)' : 'none',
              color: mode === m ? 'var(--base)' : 'var(--muted)',
              border: `1px solid ${mode === m ? 'var(--gold)' : 'var(--border-hover)'}`,
              borderRadius: 4,
              padding: isMobile ? '6px 14px' : '5px 16px',
              fontSize: isMobile ? 10 : 11,
              fontWeight: mode === m ? 600 : 400,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {m === 'venue' ? 'BY VENUE' : 'BY CATEGORY'}
          </button>
        ))}
      </div>

      {mode === 'venue' ? (
        <VenueMode
          venues={venues}
          stats={venueStats}
          selectedId={selectedVenueId}
          detail={venueDetail}
          onSelect={handleSelectVenue}
          loading={loading}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      ) : (
        <CategoryMode
          categoryNames={categoryNames}
          venues={venues}
          selectedCategory={selectedCategory}
          crossData={crossData}
          onSelect={handleSelectCategory}
          loading={loading}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}

// ─── BY VENUE MODE ────────────────────────────────────────────────────────────

function VenueMode({ venues, stats, selectedId, detail, onSelect, loading, isMobile, isTablet }) {
  const selectedVenue = venues.find(v => v.id === selectedId)

  // Grid: mobile = 2 fluid cols, tablet = 2 cols up to 280px, desktop = 2 fixed 300px cols
  const gridCols = isMobile
    ? 'repeat(2, 1fr)'
    : isTablet
    ? 'repeat(2, minmax(200px, 280px))'
    : 'repeat(2, 300px)'

  const gridGap = isMobile ? 12 : 20
  const outerPad = isMobile ? '0 16px 40px' : '0 24px 48px'
  const outerPadSelected = isMobile ? '20px 16px' : '32px 24px'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: 'calc(100vh - 90px)',
      justifyContent: selectedId ? 'flex-start' : 'center',
      padding: selectedId ? outerPadSelected : outerPad,
    }}>
      {/* Venue cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: gridGap,
        width: isMobile ? '100%' : 'auto',
        marginBottom: selectedId ? (isMobile ? 20 : 28) : 0,
      }}>
        {venues.map(v => (
          <VenueCard
            key={v.id}
            venue={v}
            stats={stats[v.id]}
            selected={selectedId === v.id}
            onClick={() => onSelect(v.id)}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Expanded venue detail */}
      {selectedId && (
        <div style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 640,
          border: '1px solid var(--gold)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {/* Detail header */}
          <div style={{
            padding: isMobile ? '10px 14px' : '12px 20px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 2 : 0 }}>
              <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.08em' }}>
                {selectedVenue?.name}
              </span>
              {!loading && (
                <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginLeft: isMobile ? 0 : 12 }}>
                  {detail.length} CATS · {detail.reduce((s, c) => s + (c.items?.length || 0), 0)} ITEMS · {detail.reduce((s, c) => s + (c.items || []).reduce((ss, i) => ss + i.qty, 0), 0)} UNITS
                </span>
              )}
            </div>
            <button
              onClick={() => onSelect(selectedId)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', padding: '0 4px', lineHeight: 1 }}
            >×</button>
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 11, letterSpacing: '0.1em' }}>LOADING...</div>
          ) : (
            <VenueDetail data={detail} isMobile={isMobile} />
          )}
        </div>
      )}
    </div>
  )
}

function VenueCard({ venue, stats, selected, onClick, isMobile }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        border: `1px solid ${selected ? 'var(--gold)' : hover ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: isMobile ? 8 : 10,
        padding: isMobile ? '16px 14px 14px' : '28px 28px 24px',
        cursor: 'pointer',
        background: selected ? 'var(--surface)' : hover ? 'var(--surface)' : 'var(--base)',
        transition: 'all 0.18s',
        transform: hover && !selected ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: selected
          ? '0 0 0 1px var(--gold)'
          : hover ? '0 8px 24px rgba(0,0,0,0.28)' : 'none',
        overflow: 'hidden',
        aspectRatio: '1 / 1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Watermark first letter */}
      <span style={{
        position: 'absolute',
        bottom: isMobile ? -6 : -10,
        right: isMobile ? 6 : 10,
        fontSize: isMobile ? 72 : 120,
        fontWeight: 700,
        color: selected ? 'rgba(201,169,110,0.08)' : 'rgba(128,128,120,0.06)',
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
        letterSpacing: '-0.04em',
        transition: 'color 0.18s',
      }}>
        {venue.name[0]}
      </span>

      {/* Venue name */}
      <div style={{
        fontSize: isMobile ? 13 : 18,
        fontWeight: 700,
        color: selected ? 'var(--gold)' : 'var(--text)',
        letterSpacing: '0.08em',
        lineHeight: 1.2,
        transition: 'color 0.18s',
      }}>
        {venue.name}
      </div>

      {/* Stats */}
      {stats ? (
        <div style={{ display: 'flex', gap: isMobile ? 10 : 24 }}>
          <CardStat label="CATS" val={stats.categoryCount} isMobile={isMobile} />
          <CardStat label="ITEMS" val={stats.itemCount} isMobile={isMobile} />
          <CardStat label="UNITS" val={stats.totalQty} isMobile={isMobile} />
        </div>
      ) : (
        <div style={{ color: 'var(--border-hover)', fontSize: 10, letterSpacing: '0.08em' }}>···</div>
      )}
    </div>
  )
}

function CardStat({ label, val, isMobile }) {
  return (
    <div>
      <div style={{ fontSize: isMobile ? 18 : 28, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: isMobile ? 8 : 9, letterSpacing: '0.12em', color: 'var(--muted)', marginTop: isMobile ? 3 : 5 }}>{label}</div>
    </div>
  )
}

function VenueDetail({ data, isMobile }) {
  return (
    <div style={{ padding: isMobile ? '12px 14px' : '16px 20px' }}>
      {data.map(cat => (
        <div key={cat.id} style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.14em',
            color: 'var(--muted)',
            marginBottom: 6,
            paddingBottom: 4,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>{cat.name}</span>
            <span>{cat.items?.length || 0} items</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {(cat.items || []).map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: isMobile ? '6px 0' : '5px 0', width: 24, color: 'var(--muted)', fontSize: 10 }}>{idx + 1}</td>
                  <td style={{ padding: isMobile ? '6px 4px' : '5px 6px', fontSize: isMobile ? 13 : 12, color: 'var(--text)', letterSpacing: '0.02em' }}>{item.name}</td>
                  <td style={{ padding: isMobile ? '6px 0' : '5px 0', width: 44, textAlign: 'right', fontWeight: 600, color: 'var(--gold)', fontSize: isMobile ? 14 : 13 }}>{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ─── BY CATEGORY MODE ─────────────────────────────────────────────────────────

function CategoryMode({ categoryNames, venues, selectedCategory, crossData, onSelect, loading, isMobile }) {
  // Mobile: 2 fluid cols; tablet/desktop: auto-fill with min 260px
  const gridCols = isMobile
    ? 'repeat(2, 1fr)'
    : 'repeat(auto-fill, minmax(260px, 320px))'

  return (
    <div style={{ padding: isMobile ? '20px 16px 24px' : '32px 24px 24px' }}>
      {/* Category cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: isMobile ? 10 : 16,
        justifyContent: 'center',
        marginBottom: selectedCategory ? (isMobile ? 20 : 32) : 0,
      }}>
        {categoryNames.map(({ name, venueCount }) => (
          <CategoryCard
            key={name}
            name={name}
            venueCount={venueCount}
            selected={selectedCategory === name}
            onClick={() => onSelect(name)}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Cross-venue comparison table */}
      {selectedCategory && (
        <div style={{ border: '1px solid var(--gold)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            padding: isMobile ? '10px 14px' : '12px 20px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.1em' }}>
                {selectedCategory}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', marginLeft: isMobile ? 8 : 12 }}>
                ACROSS ALL VENUES
              </span>
            </div>
            <button
              onClick={() => onSelect(selectedCategory)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', padding: '0 4px', lineHeight: 1 }}
            >×</button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 11, letterSpacing: '0.1em' }}>LOADING...</div>
          ) : crossData ? (
            <CrossVenueTable data={crossData} venues={venues} isMobile={isMobile} />
          ) : null}
        </div>
      )}
    </div>
  )
}

function CategoryCard({ name, venueCount, selected, onClick, isMobile }) {
  const [hover, setHover] = useState(false)
  const dots = Array.from({ length: venueCount })

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        border: `1px solid ${selected ? 'var(--gold)' : hover ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: isMobile ? '14px 12px 12px' : '20px 20px 16px',
        cursor: 'pointer',
        background: selected ? 'var(--surface)' : hover ? 'var(--surface)' : 'var(--base)',
        transition: 'all 0.18s ease',
        transform: hover && !selected ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: selected
          ? '0 0 0 1px var(--gold)'
          : hover ? '0 6px 20px rgba(0,0,0,0.2)' : 'none',
        overflow: 'hidden',
        minHeight: isMobile ? 100 : 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Watermark first letter */}
      <span style={{
        position: 'absolute',
        top: isMobile ? -4 : -6,
        right: isMobile ? 6 : 12,
        fontSize: isMobile ? 52 : 80,
        fontWeight: 700,
        color: selected ? 'rgba(201,169,110,0.10)' : 'rgba(128,128,120,0.07)',
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
        letterSpacing: '-0.04em',
        transition: 'color 0.18s',
      }}>
        {name[0]}
      </span>

      {/* Category name */}
      <div style={{
        fontSize: isMobile ? 10 : 12,
        fontWeight: 600,
        color: selected ? 'var(--gold)' : 'var(--text)',
        letterSpacing: '0.08em',
        lineHeight: 1.4,
        transition: 'color 0.18s',
        paddingRight: isMobile ? 20 : 28,
      }}>
        {name}
      </div>

      {/* Venue count + dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: isMobile ? 10 : 14 }}>
        <div style={{ display: 'flex', gap: isMobile ? 3 : 4 }}>
          {dots.map((_, i) => (
            <span key={i} style={{
              width: isMobile ? 4 : 5,
              height: isMobile ? 4 : 5,
              borderRadius: '50%',
              background: selected ? 'var(--gold)' : 'var(--border-hover)',
              display: 'inline-block',
              transition: 'background 0.18s',
            }} />
          ))}
        </div>
        <span style={{
          fontSize: isMobile ? 8 : 9,
          letterSpacing: '0.1em',
          color: selected ? 'var(--gold)' : 'var(--muted)',
          transition: 'color 0.18s',
        }}>
          {venueCount}V
        </span>
      </div>
    </div>
  )
}

function CrossVenueTable({ data, venues, isMobile }) {
  const { venueItems, allItems, venueTotals } = data
  const activeVenues = venues.filter(v => venueItems[v.name])
  const grandTotal = activeVenues.reduce((s, v) => s + (venueTotals[v.name] || 0), 0)

  if (allItems.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 11, letterSpacing: '0.1em' }}>
        NO ITEMS FOUND
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 360 : 500 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{
              padding: isMobile ? '8px 12px' : '10px 20px',
              textAlign: 'left',
              fontSize: 9,
              letterSpacing: '0.12em',
              color: 'var(--muted)',
              fontWeight: 600,
              background: 'var(--surface)',
              minWidth: isMobile ? 130 : 220,
            }}>ITEM</th>
            {activeVenues.map(v => (
              <th key={v.id} style={{
                padding: isMobile ? '8px 8px' : '10px 16px',
                textAlign: 'center',
                fontSize: 9,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                fontWeight: 600,
                background: 'var(--surface)',
                minWidth: isMobile ? 44 : 72,
              }}>{isMobile ? v.name.slice(0, 3) : v.name}</th>
            ))}
            <th style={{
              padding: isMobile ? '8px 10px' : '10px 20px',
              textAlign: 'center',
              fontSize: 9,
              letterSpacing: '0.12em',
              color: 'var(--gold)',
              fontWeight: 600,
              background: 'var(--surface)',
              minWidth: isMobile ? 40 : 64,
            }}>TOT</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((itemName, idx) => {
            const rowTotal = activeVenues.reduce((s, v) => s + (venueItems[v.name]?.[itemName] || 0), 0)
            return (
              <tr key={itemName} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--surface)' }}>
                <td style={{ padding: isMobile ? '7px 12px' : '8px 20px', fontSize: isMobile ? 11 : 12, color: 'var(--text)', letterSpacing: '0.02em' }}>
                  {itemName}
                </td>
                {activeVenues.map(v => {
                  const qty = venueItems[v.name]?.[itemName]
                  return (
                    <td key={v.id} style={{ padding: isMobile ? '7px 8px' : '8px 16px', textAlign: 'center', fontSize: isMobile ? 12 : 13, fontWeight: qty ? 600 : 400, color: qty ? 'var(--gold)' : 'var(--border-hover)' }}>
                      {qty || '—'}
                    </td>
                  )
                })}
                <td style={{ padding: isMobile ? '7px 10px' : '8px 20px', textAlign: 'center', fontSize: isMobile ? 12 : 13, fontWeight: 600, color: 'var(--text)' }}>
                  {rowTotal}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border)' }}>
            <td style={{ padding: isMobile ? '8px 12px' : '10px 20px', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600 }}>
              TOTAL
            </td>
            {activeVenues.map(v => (
              <td key={v.id} style={{ padding: isMobile ? '8px 8px' : '10px 16px', textAlign: 'center', fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--gold)' }}>
                {venueTotals[v.name] || 0}
              </td>
            ))}
            <td style={{ padding: isMobile ? '8px 10px' : '10px 20px', textAlign: 'center', fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--gold)' }}>
              {grandTotal}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
