const app = document.getElementById('app')
const toastEl = document.getElementById('toast')

const state = {
  view: 'home',
  venues: [],
  crewName: localStorage.getItem('ncpa_crew_name') || '',
  stocktake: null,
  venueId: null,
  collapsed: {},
}

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

function toast(msg) {
  toastEl.hidden = false
  toastEl.textContent = msg
  clearTimeout(toast._t)
  toast._t = setTimeout(() => { toastEl.hidden = true }, 2200)
}

function setView(view) {
  state.view = view
  document.querySelectorAll('#nav-tabs button').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view)
  })
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  render()
}

document.getElementById('nav-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-view]')
  if (!btn) return
  if (btn.dataset.view === 'home') {
    state.stocktake = null
    state.venueId = null
  }
  setView(btn.dataset.view)
})

function shortfallClass(expected, counted) {
  if (counted === null || counted === undefined || counted === '') return ''
  const s = Math.max(0, Number(expected) - Number(counted))
  return s > 0 ? 'short' : 'ok'
}

function shortfallValue(expected, counted) {
  if (counted === null || counted === undefined || counted === '') return '—'
  return Math.max(0, Number(expected) - Number(counted))
}

function cardStateClass(expected, counted) {
  if (counted === null || counted === undefined || counted === '') return ''
  return Math.max(0, Number(expected) - Number(counted)) > 0 ? 'short' : 'done'
}

function updateHeaderStats(st) {
  const lines = st.lines || []
  const countedNow = lines.filter((l) => l.counted_qty !== null && l.counted_qty !== undefined).length
  const shortUnitsNow = lines.reduce((s, l) => s + (l.shortfall > 0 ? l.shortfall : 0), 0)
  const pct = lines.length ? Math.round((countedNow / lines.length) * 100) : 0
  const countedEl = app.querySelector('[data-stat=counted]')
  const shortEl = app.querySelector('[data-stat=short]')
  const leftEl = app.querySelector('[data-stat=left]')
  if (countedEl) countedEl.textContent = `${countedNow}/${lines.length}`
  if (shortEl) shortEl.textContent = String(shortUnitsNow)
  if (leftEl) leftEl.textContent = String(lines.length - countedNow)
  const bar = app.querySelector('.progress > span')
  if (bar) bar.style.width = `${pct}%`
}

async function render() {
  if (state.view === 'home') return renderHome()
  if (state.view === 'stocktake') return renderStocktake()
  if (state.view === 'history') return renderHistory()
  if (state.view === 'import') return renderImport()
}

async function renderHome() {
  app.innerHTML = `<h1>Take inventory</h1>
    <p class="lede">Pick a venue. Count what’s there. Shortfall updates as you go.</p>
    <div class="field">
      <label>Your name</label>
      <input id="crew" autocomplete="name" enterkeyhint="done" placeholder="e.g. Ravi" value="${escapeAttr(state.crewName)}" />
    </div>
    <div class="venue-grid" id="venues"><div class="empty">Loading venues…</div></div>`

  const crewInput = document.getElementById('crew')
  crewInput.addEventListener('change', (e) => {
    state.crewName = e.target.value.trim()
    localStorage.setItem('ncpa_crew_name', state.crewName)
  })

  try {
    state.venues = await api('/venues')
    const grid = document.getElementById('venues')
    if (!state.venues.length) {
      grid.innerHTML = `<div class="empty">No venues yet. Import the Excel inventory first.</div>`
      return
    }
    grid.innerHTML = state.venues.map((v) => `
      <button class="venue-card" data-id="${v.id}" type="button">
        <div class="name">${escapeHtml(v.name)}</div>
        <div class="meta">Tap to count stock</div>
      </button>
    `).join('')
    grid.querySelectorAll('.venue-card').forEach((btn) => {
      btn.addEventListener('click', () => startStocktake(Number(btn.dataset.id)))
    })
  } catch (err) {
    document.getElementById('venues').innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`
  }
}

async function startStocktake(venueId) {
  const crew = (document.getElementById('crew')?.value || state.crewName || '').trim()
  if (!crew) {
    toast('Enter your name first')
    document.getElementById('crew')?.focus()
    return
  }
  state.crewName = crew
  localStorage.setItem('ncpa_crew_name', crew)
  try {
    const created = await api('/stocktakes', {
      method: 'POST',
      body: JSON.stringify({ venue_id: venueId, crew_name: crew }),
    })
    state.venueId = venueId
    state.stocktake = await api(`/stocktakes/${created.id}`)
    state.view = 'stocktake'
    document.querySelectorAll('#nav-tabs button').forEach((b) => b.classList.remove('active'))
    toast(created.resumed ? 'Resumed open stocktake' : 'Stocktake started')
    render()
  } catch (err) {
    toast(err.message)
  }
}

function groupLines(lines) {
  const map = new Map()
  for (const line of lines) {
    const key = line.category_name
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(line)
  }
  return [...map.entries()]
}

async function saveCount(st, itemId, countedQty, card) {
  const result = await api(`/stocktakes/${st.id}/lines`, {
    method: 'PATCH',
    body: JSON.stringify({ item_id: itemId, counted_qty: countedQty }),
  })
  const line = st.lines.find((l) => l.item_id === itemId)
  if (line) {
    line.counted_qty = result.counted_qty
    line.shortfall = result.shortfall
  }
  if (card && line) {
    const input = card.querySelector('input.counted')
    if (input && document.activeElement !== input) {
      input.value = result.counted_qty === null ? '' : result.counted_qty
    }
    const shortChip = card.querySelector('[data-short]')
    const shortVal = shortfallValue(line.expected_qty, line.counted_qty)
    const cls = shortfallClass(line.expected_qty, line.counted_qty)
    shortChip.textContent = shortVal
    shortChip.parentElement.className = `chip ${cls || ''}`.trim()
    card.className = `item-card ${cardStateClass(line.expected_qty, line.counted_qty)}`.trim()

    const section = card.closest('.cat')
    if (section) {
      const items = [...section.querySelectorAll('.item-card')]
      const done = items.filter((el) => el.classList.contains('done') || el.classList.contains('short')).length
      section.querySelector('.count').textContent = `${done}/${items.length}`
    }
  }
  updateHeaderStats(st)
  return result
}

async function renderStocktake() {
  if (!state.stocktake) return setView('home')
  const st = state.stocktake
  const lines = st.lines || []
  const counted = lines.filter((l) => l.counted_qty !== null && l.counted_qty !== undefined).length
  const pct = lines.length ? Math.round((counted / lines.length) * 100) : 0
  const shortUnits = lines.reduce((s, l) => s + (l.shortfall > 0 ? l.shortfall : 0), 0)
  const left = lines.length - counted
  const groups = groupLines(lines)
  const editable = st.status === 'in_progress'

  app.innerHTML = `
    <div class="bar">
      <button class="btn ghost small" id="back" type="button">← Venues</button>
      <div class="spacer"></div>
      <span class="badge ${st.status === 'submitted' ? 'done' : 'open'}">${st.status}</span>
    </div>
    <h1>${escapeHtml(st.venue_name)}</h1>
    <p class="lede">${escapeHtml(st.crew_name)}</p>
    <div class="stats-strip">
      <div class="stat"><div class="v" data-stat="counted">${counted}/${lines.length}</div><div class="k">Counted</div></div>
      <div class="stat"><div class="v" data-stat="short">${shortUnits}</div><div class="k">Shortfall</div></div>
      <div class="stat"><div class="v" data-stat="left">${left}</div><div class="k">Left</div></div>
    </div>
    <div class="progress"><span style="width:${pct}%"></span></div>
    <div id="cats"></div>
    ${editable ? `
      <div class="sticky-actions">
        <button class="btn danger" id="submit-partial" type="button">Partial</button>
        <button class="btn primary" id="submit-all" type="button">Submit</button>
      </div>
    ` : ''}
  `

  document.getElementById('back').onclick = () => {
    state.stocktake = null
    setView('home')
  }

  const cats = document.getElementById('cats')
  cats.innerHTML = groups.map(([cat, items]) => {
    const open = state.collapsed[cat] !== false
    const done = items.filter((i) => i.counted_qty !== null && i.counted_qty !== undefined).length
    return `
      <section class="cat ${open ? 'open' : ''}" data-cat="${escapeAttr(cat)}">
        <button class="cat-head" type="button">
          <span class="title">${escapeHtml(cat)}</span>
          <span class="count">${done}/${items.length}</span>
        </button>
        <div class="cat-body">
          ${items.map((line) => {
            const countedVal = line.counted_qty === null || line.counted_qty === undefined ? '' : line.counted_qty
            const cls = shortfallClass(line.expected_qty, line.counted_qty)
            const short = shortfallValue(line.expected_qty, line.counted_qty)
            return `
              <div class="item-card ${cardStateClass(line.expected_qty, line.counted_qty)}" data-item="${line.item_id}" data-expected="${line.expected_qty}">
                <div class="item-name">${escapeHtml(line.item_name)}</div>
                <div class="item-meta">
                  <div class="chip">
                    <span class="label">Expected</span>
                    <span class="value">${line.expected_qty}</span>
                  </div>
                  <div class="chip ${cls}">
                    <span class="label">Shortfall</span>
                    <span class="value" data-short>${short}</span>
                  </div>
                </div>
                <div class="counter">
                  <button type="button" class="dec" ${editable ? '' : 'disabled'} aria-label="Decrease">−</button>
                  <input class="counted" inputmode="numeric" pattern="[0-9]*" enterkeyhint="next" ${editable ? '' : 'disabled'} value="${countedVal}" placeholder="0" />
                  <button type="button" class="inc" ${editable ? '' : 'disabled'} aria-label="Increase">+</button>
                </div>
                ${editable ? `
                  <div class="quick-row">
                    <button type="button" class="btn small match">Match expected</button>
                    <button type="button" class="btn small zero">Count 0</button>
                  </div>
                ` : ''}
              </div>
            `
          }).join('')}
        </div>
      </section>
    `
  }).join('')

  cats.querySelectorAll('.cat-head').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.cat')
      const cat = section.dataset.cat
      const open = !section.classList.contains('open')
      section.classList.toggle('open', open)
      state.collapsed[cat] = open
    })
  })

  if (!editable) return

  cats.querySelectorAll('.item-card').forEach((card) => {
    const itemId = Number(card.dataset.item)
    const expected = Number(card.dataset.expected)
    const input = card.querySelector('input.counted')

    const commit = async (value) => {
      try {
        await saveCount(st, itemId, value, card)
      } catch (err) {
        toast(err.message)
      }
    }

    const parseInput = () => {
      const raw = input.value.trim()
      if (raw === '') return null
      return Math.max(0, parseInt(raw, 10) || 0)
    }

    card.querySelector('.dec').addEventListener('click', async () => {
      const current = parseInput()
      const next = Math.max(0, (current ?? 0) - 1)
      input.value = next
      await commit(next)
    })

    card.querySelector('.inc').addEventListener('click', async () => {
      const current = parseInput()
      const next = (current ?? 0) + 1
      input.value = next
      await commit(next)
    })

    card.querySelector('.match')?.addEventListener('click', async () => {
      input.value = expected
      await commit(expected)
    })

    card.querySelector('.zero')?.addEventListener('click', async () => {
      input.value = 0
      await commit(0)
    })

    input.addEventListener('change', async () => {
      const value = parseInput()
      if (value !== null) input.value = value
      await commit(value)
    })

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        input.blur()
        const cards = [...cats.querySelectorAll('.item-card input.counted')]
        const idx = cards.indexOf(input)
        const next = cards[idx + 1]
        if (next) next.focus()
      }
    })
  })

  document.getElementById('submit-all').onclick = () => submitStocktake(false)
  document.getElementById('submit-partial').onclick = () => submitStocktake(true)
}

async function submitStocktake(allowPartial) {
  try {
    const result = await api(`/stocktakes/${state.stocktake.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ allow_partial: allowPartial }),
    })
    toast(`Submitted · shortfall ${result.summary.total_shortfall} units`)
    state.stocktake = await api(`/stocktakes/${state.stocktake.id}`)
    render()
  } catch (err) {
    if (err.message.includes('Not all items counted')) {
      toast('Count remaining items, or tap Partial')
    } else {
      toast(err.message)
    }
  }
}

async function renderHistory() {
  app.innerHTML = `<h1>Shortfall reports</h1>
    <p class="lede">Open a stocktake to review counts.</p>
    <div id="list"><div class="empty">Loading…</div></div>`
  try {
    const rows = await api('/stocktakes')
    const list = document.getElementById('list')
    if (!rows.length) {
      list.innerHTML = `<div class="empty">No stocktakes yet.</div>`
      return
    }
    list.innerHTML = rows.map((r) => `
      <button class="card" data-id="${r.id}" type="button" style="width:100%;text-align:left;cursor:pointer">
        <div class="title-row">
          <strong>${escapeHtml(r.venue_name)}</strong>
          <span class="badge ${r.status === 'submitted' ? 'done' : 'open'}">${r.status}</span>
        </div>
        <div class="meta">${escapeHtml(r.crew_name)} · ${r.counted_lines}/${r.total_lines} counted · shortfall ${r.total_shortfall}</div>
        <div class="meta">${escapeHtml(r.started_at)}${r.submitted_at ? ' → ' + escapeHtml(r.submitted_at) : ''}</div>
      </button>
    `).join('')
    list.querySelectorAll('.card').forEach((btn) => {
      btn.addEventListener('click', async () => {
        state.stocktake = await api(`/stocktakes/${btn.dataset.id}`)
        state.view = 'stocktake'
        document.querySelectorAll('#nav-tabs button').forEach((b) => b.classList.remove('active'))
        render()
      })
    })
  } catch (err) {
    document.getElementById('list').innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`
  }
}

function renderImport() {
  app.innerHTML = `
    <h1>Import Excel</h1>
    <p class="lede">Upload the latest inventory workbook to refresh expected quantities.</p>
    <div class="import-box">
      <div class="hint">Use the same layout as <strong>NCPA_Inventory_All.xlsx</strong> (EQUIPMENT NAME, CATEGORY, JBT, TATA, TET, LT, GDT, OFFICE).</div>
      <input type="file" id="file" accept=".xlsx,.xls" />
      <div id="import-status" class="hint" style="margin-top:12px"></div>
    </div>
  `
  document.getElementById('file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    const status = document.getElementById('import-status')
    if (!file) return
    status.textContent = 'Parsing…'
    try {
      const buf = await file.arrayBuffer()
      const XLSX = await loadXlsx()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const venues = ['JBT', 'TATA', 'TET', 'LT', 'GDT', 'OFFICE']
      let category = ''
      const rows = []
      for (const r of raw) {
        const sn = String(r['SR.NO.'] ?? '').trim()
        const name = String(r['EQUIPMENT NAME'] ?? '').trim()
        const cat = String(r['CATEGORY'] ?? '').trim()
        if (!name && sn && !/^\d+$/.test(sn)) { category = sn; continue }
        if (!name) continue
        if (cat) category = cat
        const qty = {}
        for (const v of venues) qty[v] = Number(r[v]) || 0
        rows.push({
          name: name.toUpperCase(),
          category: (category || 'UNCATEGORIZED').toUpperCase(),
          qty,
        })
      }
      status.textContent = `Uploading ${rows.length} items…`
      const result = await api('/import/excel', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      })
      status.textContent = `Imported ${result.imported} items into expected stock.`
      toast('Inventory baselines updated')
    } catch (err) {
      status.textContent = err.message
      toast(err.message)
    }
  })
}

let xlsxPromise
function loadXlsx() {
  if (!xlsxPromise) {
    xlsxPromise = import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs')
  }
  return xlsxPromise
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("'", '&#39;')
}

render()
