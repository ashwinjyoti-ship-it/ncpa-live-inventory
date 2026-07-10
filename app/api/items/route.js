import { getDB } from '@/lib/db'
import { NextResponse } from 'next/server'


export async function GET(req) {
  const db = await getDB()
  const { searchParams } = new URL(req.url)
  const venue_id = searchParams.get('venue_id')
  const q = searchParams.get('q')

  let sql = `
    SELECT
      items.id AS id,
      items.name AS name,
      items.qty AS qty,
      items.category_id AS category_id,
      items.updated_at AS updated_at,
      categories.id AS cat_id,
      categories.name AS cat_name,
      categories.venue_id AS cat_venue_id,
      categories.position AS cat_position
    FROM items
    JOIN categories ON categories.id = items.category_id
    WHERE 1 = 1
  `
  const params = []

  if (venue_id) {
    sql += ' AND categories.venue_id = ?'
    params.push(venue_id)
  }
  if (q) {
    // SQLite's LIKE is case-insensitive for ASCII by default, matching the
    // previous Supabase .ilike() behavior.
    sql += ' AND items.name LIKE ?'
    params.push(`%${q}%`)
  }
  sql += ' ORDER BY categories.position, items.name'

  try {
    const { results } = await db.prepare(sql).bind(...params).all()
    const data = (results || []).map((row) => ({
      id: row.id,
      name: row.name,
      qty: row.qty,
      category_id: row.category_id,
      updated_at: row.updated_at,
      categories: {
        id: row.cat_id,
        name: row.cat_name,
        venue_id: row.cat_venue_id,
        position: row.cat_position,
      },
    }))
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  const db = await getDB()
  const body = await req.json()
  const { name, qty, category_id } = body
  if (!name || !category_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const id = crypto.randomUUID()

  try {
    await db
      .prepare('INSERT INTO items (id, name, qty, category_id) VALUES (?, ?, ?, ?)')
      .bind(id, name.trim().toUpperCase(), qty || 0, category_id)
      .run()

    const item = await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).first()
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  const db = await getDB()
  const body = await req.json()
  const { id, name, qty } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const fields = []
  const params = []
  if (name !== undefined) {
    fields.push('name = ?')
    params.push(name.trim().toUpperCase())
  }
  if (qty !== undefined) {
    fields.push('qty = ?')
    params.push(qty)
  }
  fields.push("updated_at = datetime('now')")
  params.push(id)

  try {
    await db.prepare(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run()
    const item = await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).first()
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  const db = await getDB()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    await db.prepare('DELETE FROM items WHERE id = ?').bind(id).run()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
