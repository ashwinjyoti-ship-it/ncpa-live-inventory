/**
 * Cloudflare Pages Function — /api/*
 * Crew stocktake API backed by D1.
 */

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '') || '/'
  const method = request.method.toUpperCase()

  try {
    if (!env.DB) return json({ error: 'D1 binding DB missing' }, 500)

    if (method === 'GET' && path === '/health') {
      return json({ ok: true })
    }

    if (method === 'GET' && path === '/venues') {
      const { results } = await env.DB.prepare(
        'SELECT id, name, sort_order FROM venues ORDER BY sort_order, name'
      ).all()
      return json(results)
    }

    if (method === 'GET' && path === '/venue-stock') {
      const venueId = url.searchParams.get('venue_id')
      if (!venueId) return json({ error: 'venue_id required' }, 400)

      const { results } = await env.DB.prepare(`
        SELECT
          i.id AS item_id,
          i.name AS item_name,
          c.id AS category_id,
          c.name AS category_name,
          c.sort_order AS category_sort,
          vs.expected_qty
        FROM venue_stock vs
        JOIN items i ON i.id = vs.item_id
        JOIN categories c ON c.id = i.category_id
        WHERE vs.venue_id = ?
          AND vs.expected_qty > 0
        ORDER BY c.sort_order, c.name, i.name
      `).bind(venueId).all()

      return json(results)
    }

    if (method === 'GET' && path === '/stocktakes') {
      const venueId = url.searchParams.get('venue_id')
      let sql = `
        SELECT s.*, v.name AS venue_name,
          (SELECT COUNT(*) FROM stocktake_lines sl WHERE sl.stocktake_id = s.id AND sl.counted_qty IS NOT NULL) AS counted_lines,
          (SELECT COUNT(*) FROM stocktake_lines sl WHERE sl.stocktake_id = s.id) AS total_lines,
          (SELECT COALESCE(SUM(CASE WHEN sl.shortfall > 0 THEN sl.shortfall ELSE 0 END), 0)
             FROM stocktake_lines sl WHERE sl.stocktake_id = s.id) AS total_shortfall
        FROM stocktakes s
        JOIN venues v ON v.id = s.venue_id
      `
      const params = []
      if (venueId) {
        sql += ' WHERE s.venue_id = ?'
        params.push(venueId)
      }
      sql += ' ORDER BY s.started_at DESC LIMIT 50'
      const stmt = env.DB.prepare(sql)
      const { results } = params.length ? await stmt.bind(...params).all() : await stmt.all()
      return json(results)
    }

    if (method === 'GET' && path.startsWith('/stocktakes/')) {
      const id = path.split('/')[2]
      const stocktake = await env.DB.prepare(`
        SELECT s.*, v.name AS venue_name
        FROM stocktakes s
        JOIN venues v ON v.id = s.venue_id
        WHERE s.id = ?
      `).bind(id).first()
      if (!stocktake) return json({ error: 'Not found' }, 404)

      const { results: lines } = await env.DB.prepare(`
        SELECT
          sl.*,
          i.name AS item_name,
          c.name AS category_name,
          c.sort_order AS category_sort
        FROM stocktake_lines sl
        JOIN items i ON i.id = sl.item_id
        JOIN categories c ON c.id = i.category_id
        WHERE sl.stocktake_id = ?
        ORDER BY c.sort_order, c.name, i.name
      `).bind(id).all()

      return json({ ...stocktake, lines })
    }

    if (method === 'POST' && path === '/stocktakes') {
      const body = await request.json()
      const venueId = body.venue_id
      const crewName = String(body.crew_name || '').trim()
      if (!venueId || !crewName) return json({ error: 'venue_id and crew_name required' }, 400)

      const open = await env.DB.prepare(`
        SELECT id FROM stocktakes
        WHERE venue_id = ? AND status = 'in_progress'
        ORDER BY started_at DESC LIMIT 1
      `).bind(venueId).first()

      if (open && !body.force_new) {
        return json({ id: open.id, resumed: true })
      }

      const created = await env.DB.prepare(`
        INSERT INTO stocktakes (venue_id, crew_name, status)
        VALUES (?, ?, 'in_progress')
      `).bind(venueId, crewName).run()
      const stocktakeId = created.meta.last_row_id

      await env.DB.prepare(`
        INSERT INTO stocktake_lines (stocktake_id, item_id, expected_qty, counted_qty, shortfall)
        SELECT ?, vs.item_id, vs.expected_qty, NULL, NULL
        FROM venue_stock vs
        WHERE vs.venue_id = ? AND vs.expected_qty > 0
      `).bind(stocktakeId, venueId).run()

      return json({ id: stocktakeId, resumed: false }, 201)
    }

    if (method === 'PATCH' && path.startsWith('/stocktakes/') && path.endsWith('/lines')) {
      const id = path.split('/')[2]
      const body = await request.json()
      const itemId = body.item_id
      if (!itemId) return json({ error: 'item_id required' }, 400)

      const stocktake = await env.DB.prepare(
        `SELECT id, status FROM stocktakes WHERE id = ?`
      ).bind(id).first()
      if (!stocktake) return json({ error: 'Not found' }, 404)
      if (stocktake.status !== 'in_progress') {
        return json({ error: 'Stocktake already submitted' }, 400)
      }

      const line = await env.DB.prepare(`
        SELECT id, expected_qty FROM stocktake_lines
        WHERE stocktake_id = ? AND item_id = ?
      `).bind(id, itemId).first()
      if (!line) return json({ error: 'Line not found' }, 404)

      const counted = body.counted_qty === null || body.counted_qty === ''
        ? null
        : Math.max(0, parseInt(body.counted_qty, 10) || 0)
      const shortfall = counted === null ? null : Math.max(0, line.expected_qty - counted)
      const note = body.note !== undefined ? String(body.note || '').trim() : undefined

      if (note !== undefined) {
        await env.DB.prepare(`
          UPDATE stocktake_lines
          SET counted_qty = ?, shortfall = ?, note = ?
          WHERE id = ?
        `).bind(counted, shortfall, note, line.id).run()
      } else {
        await env.DB.prepare(`
          UPDATE stocktake_lines
          SET counted_qty = ?, shortfall = ?
          WHERE id = ?
        `).bind(counted, shortfall, line.id).run()
      }

      return json({ ok: true, counted_qty: counted, shortfall })
    }

    if (method === 'POST' && path.startsWith('/stocktakes/') && path.endsWith('/submit')) {
      const id = path.split('/')[2]
      const stocktake = await env.DB.prepare(
        `SELECT id, status FROM stocktakes WHERE id = ?`
      ).bind(id).first()
      if (!stocktake) return json({ error: 'Not found' }, 404)
      if (stocktake.status !== 'in_progress') {
        return json({ error: 'Already submitted' }, 400)
      }

      const incomplete = await env.DB.prepare(`
        SELECT COUNT(*) AS c FROM stocktake_lines
        WHERE stocktake_id = ? AND counted_qty IS NULL
      `).bind(id).first()

      const body = await request.json().catch(() => ({}))
      if (incomplete?.c > 0 && !body.allow_partial) {
        return json({
          error: 'Not all items counted',
          remaining: incomplete.c,
        }, 400)
      }

      await env.DB.prepare(`
        UPDATE stocktakes
        SET status = 'submitted',
            submitted_at = datetime('now'),
            notes = COALESCE(?, notes)
        WHERE id = ?
      `).bind(body.notes || null, id).run()

      const summary = await env.DB.prepare(`
        SELECT
          COUNT(*) AS total_lines,
          SUM(CASE WHEN counted_qty IS NOT NULL THEN 1 ELSE 0 END) AS counted_lines,
          COALESCE(SUM(CASE WHEN shortfall > 0 THEN shortfall ELSE 0 END), 0) AS total_shortfall,
          COALESCE(SUM(CASE WHEN shortfall > 0 THEN 1 ELSE 0 END), 0) AS shortfall_items
        FROM stocktake_lines
        WHERE stocktake_id = ?
      `).bind(id).first()

      return json({ ok: true, summary })
    }

    if (method === 'POST' && path === '/import/excel') {
      // Accept JSON payload already parsed by client: { rows: [{name, category, qty: {JBT: n, ...}}] }
      const body = await request.json()
      const rows = body.rows
      if (!Array.isArray(rows) || !rows.length) {
        return json({ error: 'rows[] required (parse Excel client-side first)' }, 400)
      }

      const venueNames = ['JBT', 'TATA', 'TET', 'LT', 'GDT', 'OFFICE']
      for (let i = 0; i < venueNames.length; i++) {
        await env.DB.prepare(
          `INSERT INTO venues (name, sort_order) VALUES (?, ?)
           ON CONFLICT(name) DO UPDATE SET sort_order = excluded.sort_order`
        ).bind(venueNames[i], i).run()
      }

      const { results: venues } = await env.DB.prepare('SELECT id, name FROM venues').all()
      const venueMap = Object.fromEntries(venues.map((v) => [v.name, v.id]))

      const catOrder = []
      for (const row of rows) {
        const cat = String(row.category || 'UNCATEGORIZED').trim().toUpperCase()
        if (!catOrder.includes(cat)) catOrder.push(cat)
      }
      for (let i = 0; i < catOrder.length; i++) {
        await env.DB.prepare(
          `INSERT INTO categories (name, sort_order) VALUES (?, ?)
           ON CONFLICT(name) DO UPDATE SET sort_order = excluded.sort_order`
        ).bind(catOrder[i], i).run()
      }
      const { results: cats } = await env.DB.prepare('SELECT id, name FROM categories').all()
      const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]))

      // Replace stock baselines for imported items
      for (const row of rows) {
        const name = String(row.name || '').trim().toUpperCase()
        const cat = String(row.category || 'UNCATEGORIZED').trim().toUpperCase()
        if (!name) continue
        const categoryId = catMap[cat]
        await env.DB.prepare(
          `INSERT INTO items (name, category_id) VALUES (?, ?)
           ON CONFLICT(name, category_id) DO NOTHING`
        ).bind(name, categoryId).run()
        const item = await env.DB.prepare(
          `SELECT id FROM items WHERE name = ? AND category_id = ?`
        ).bind(name, categoryId).first()

        for (const vName of venueNames) {
          const qty = Math.max(0, parseInt(row.qty?.[vName] ?? 0, 10) || 0)
          await env.DB.prepare(`
            INSERT INTO venue_stock (venue_id, item_id, expected_qty)
            VALUES (?, ?, ?)
            ON CONFLICT(venue_id, item_id) DO UPDATE SET expected_qty = excluded.expected_qty
          `).bind(venueMap[vName], item.id, qty).run()
        }
      }

      return json({ ok: true, imported: rows.length })
    }

    return json({ error: 'Not found', path }, 404)
  } catch (err) {
    return json({ error: err.message || String(err) }, 500)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
