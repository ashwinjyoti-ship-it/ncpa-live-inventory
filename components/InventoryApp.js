'use client'
import { useState, useEffect, useCallback } from 'react'

export default function InventoryApp({ initialVenues }) {
  const [venues] = useState(initialVenues)
  const [activeVenueId, setActiveVenueId] = useState(initialVenues[0]?.id || null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [editItem, setEditItem] = useState(null)
  const [addingItem, setAddingItem] = useState(null)
  const [newCatName, setNewCatName] = useState('')
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const loadCategories = useCallback(async (venueId) => {
    if (!venueId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/categories?venue_id=${venueId}`)
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (e) {
      showToast('Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeVenueId) loadCategories(activeVenueId)
  }, [activeVenueId, loadCategories])

  const activeVenue = venues.find(v => v.id === activeVenueId)
  const totalItems = categories.reduce((s, c) => s + (c.items?.length || 0), 0)
  const totalQty = categories.reduce((s, c) => s + (c.items || []).reduce((ss, i) => ss + i.qty, 0), 0)

  const filteredCategories = search
    ? categories.map(c => ({ ...c, items: (c.items || []).filter(i => i.name.toLowerCase().includes(search.toLowerCase())) })).filter(c => c.items.length > 0)
    : categories

  // --- Item CRUD ---
  async function handleSaveItem(item, catId) {
    setSaving(true)
    try {
      if (item.id) {
        await fetch('/api/items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, name: item.name, qty: item.qty }) })
      } else {
        await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, qty: item.qty, category_id: catId }) })
      }
      setEditItem(null)
      setAddingItem(null)
      await loadCategories(activeVenueId)
      showToast(item.id ? 'Updated' : 'Added')
    } catch (e) { showToast('Error saving') } finally { setSaving(false) }
  }

  async function handleDeleteItem(id) {
    if (!confirm('Delete this item?')) return
    setSaving(true)
    try {
      await fetch(`/api/items?id=${id}`, { method: 'DELETE' })
      await loadCategories(activeVenueId)
      showToast('Deleted')
    } catch (e) { showToast('Error') } finally { setSaving(false) }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setSaving(true)
    try {
      await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCatName, venue_id: activeVenueId }) })
      setNewCatName('')
      await loadCategories(activeVenueId)
      showToast('Category added')
    } catch (e) { showToast('Error') } finally { setSaving(false) }
  }

  async function handleDeleteCategory(id, name, itemCount) {
    if (!confirm(`Delete "${name}" and all ${itemCount} items?`)) return
    setSaving(true)
    try {
      await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
      await loadCategories(activeVenueId)
      showToast('Category deleted')
    } catch (e) { showToast('Error') } finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', padding: '0' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.06em' }}>MANAGE EQUIPMENT</div>
        <input
          type="text"
          placeholder="SEARCH EQUIPMENT..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 260, letterSpacing: '0.05em' }}
        />
      </div>

      {/* Venue Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', gap: 0, overflowX: 'auto' }}>
        {venues.map(v => (
          <button
            key={v.id}
            onClick={() => { setActiveVenueId(v.id); setEditItem(null); setAddingItem(null); setSearch('') }}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: v.id === activeVenueId ? '2px solid var(--gold)' : '2px solid transparent',
              color: v.id === activeVenueId ? 'var(--gold)' : 'var(--muted)',
              fontSize: 12,
              fontWeight: v.id === activeVenueId ? 600 : 400,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 24px', display: 'flex', gap: 24, borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'CATEGORIES', val: categories.length },
          { label: 'LINE ITEMS', val: totalItems },
          { label: 'TOTAL UNITS', val: totalQty },
        ].map(s => (
          <div key={s.label}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--gold)', marginRight: 6 }}>{s.val}</span>
            <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>{s.label}</span>
          </div>
        ))}
        {saving && <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', marginLeft: 'auto', alignSelf: 'center' }}>SAVING...</span>}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 24px', maxWidth: 900 }}>
        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 12, letterSpacing: '0.1em', padding: '40px 0', textAlign: 'center' }}>LOADING...</div>
        ) : (
          <>
            {filteredCategories.map(cat => {
              const isOpen = collapsed[cat.id] !== true
              return (
                <div key={cat.id} style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                  {/* Category header */}
                  <div
                    onClick={() => setCollapsed(p => ({ ...p, [cat.id]: isOpen }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: 'var(--surface)', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--muted)' }}>{cat.name}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginRight: 4 }}>{cat.items?.length || 0}</span>
                      <Btn onClick={() => setAddingItem({ catId: cat.id, name: '', qty: 1 })} title="Add item">+</Btn>
                      <Btn onClick={() => handleDeleteCategory(cat.id, cat.name, cat.items?.length || 0)} danger title="Delete category">×</Btn>
                      <span style={{ fontSize: 10, color: 'var(--muted)', transform: isOpen ? 'none' : 'rotate(-90deg)', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
                    </div>
                  </div>

                  {isOpen && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {(cat.items || []).map((item, idx) => {
                          const isEditing = editItem?.id === item.id
                          return (
                            <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                              <td style={{ padding: '7px 14px', width: 32, color: 'var(--muted)', fontSize: 10 }}>{idx + 1}</td>
                              <td style={{ padding: '7px 6px' }}>
                                {isEditing
                                  ? <input value={editItem.name} onChange={e => setEditItem(p => ({ ...p, name: e.target.value }))} style={{ width: '100%' }} autoFocus />
                                  : <span style={{ fontSize: 12, color: 'var(--text)', letterSpacing: '0.03em' }}>{item.name}</span>}
                              </td>
                              <td style={{ padding: '7px 6px', width: 72, textAlign: 'center' }}>
                                {isEditing
                                  ? <input type="number" value={editItem.qty} onChange={e => setEditItem(p => ({ ...p, qty: parseInt(e.target.value) || 0 }))} style={{ width: 54, textAlign: 'center' }} />
                                  : <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{item.qty}</span>}
                              </td>
                              <td style={{ padding: '7px 14px', width: 96, textAlign: 'right' }}>
                                {isEditing ? (
                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                    <Btn gold onClick={() => handleSaveItem(editItem, cat.id)}>✓</Btn>
                                    <Btn onClick={() => setEditItem(null)}>✕</Btn>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                    <Btn onClick={() => setEditItem({ id: item.id, name: item.name, qty: item.qty })}>Edit</Btn>
                                    <Btn danger onClick={() => handleDeleteItem(item.id)}>Del</Btn>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}

                        {/* Add item row */}
                        {addingItem?.catId === cat.id && (
                          <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
                            <td style={{ padding: '7px 14px', color: 'var(--muted)', fontSize: 10 }}>+</td>
                            <td style={{ padding: '7px 6px' }}>
                              <input placeholder="EQUIPMENT NAME..." value={addingItem.name} onChange={e => setAddingItem(p => ({ ...p, name: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addingItem.name.trim() && handleSaveItem(addingItem, cat.id)}
                                style={{ width: '100%' }} autoFocus />
                            </td>
                            <td style={{ padding: '7px 6px', width: 72 }}>
                              <input type="number" value={addingItem.qty} onChange={e => setAddingItem(p => ({ ...p, qty: parseInt(e.target.value) || 0 }))} style={{ width: 54, textAlign: 'center' }} />
                            </td>
                            <td style={{ padding: '7px 14px', width: 96 }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                <Btn gold onClick={() => addingItem.name.trim() && handleSaveItem(addingItem, cat.id)}>Add</Btn>
                                <Btn onClick={() => setAddingItem(null)}>✕</Btn>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}

            {filteredCategories.length === 0 && !loading && (
              <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '40px 0', letterSpacing: '0.1em' }}>
                {search ? 'NO RESULTS' : 'NO CATEGORIES YET'}
              </div>
            )}

            {/* Add category */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <input
                placeholder="NEW CATEGORY NAME..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                style={{ flex: 1, letterSpacing: '0.05em' }}
              />
              <button
                onClick={handleAddCategory}
                style={{ background: 'var(--gold)', color: 'var(--base)', border: 'none', borderRadius: 4, padding: '6px 16px', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                + CATEGORY
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--gold)', color: 'var(--base)', padding: '8px 18px', borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', zIndex: 999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function Btn({ children, onClick, danger, gold, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'none',
      border: `1px solid ${danger ? 'var(--danger)' : gold ? 'var(--gold)' : 'var(--border-hover)'}`,
      color: danger ? 'var(--danger)' : gold ? 'var(--gold)' : 'var(--muted)',
      borderRadius: 4, padding: '3px 8px', fontSize: 11, fontFamily: 'inherit',
      cursor: 'pointer', transition: 'opacity 0.1s', letterSpacing: '0.05em',
    }}
    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >{children}</button>
  )
}
