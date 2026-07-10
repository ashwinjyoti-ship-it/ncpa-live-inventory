import { getDB } from '@/lib/db'
import { NextResponse } from 'next/server'


export async function GET(req) {
  const db = await getDB()
  const { searchParams } = new URL(req.url)
  const venue_id = searchParams.get('venue_id')

  let sql = 'SELECT * FROM categories'
  const params = []
  if (venue_id) {
    sql += ' WHERE venue_id = ?'
    params.push(venue_id)
  }
  sql += ' ORDER BY position'

  try {
    const { results: categories } = await db.prepare(sql).bind(...params).all()

    const catIds = (categories || []).map((c) => c.id)
    const itemsByCategory = {}

    if (catIds.length) {
      const placeholders = catIds.map(() => '?').join(',')
      const { results: items } = await db
        .prepare(`SELECT * FROM items WHERE category_id IN (${placeholders}) ORDER BY name`)
        .bind(...catIds)
        .all()

      items.forEach((item) => {
        if (!itemsByCategory[item.category_id]) itemsByCategory[item.category_id] = []
        itemsByCategory[item.category_id].push(item)
      })
    }

    const data = (categories || []).map((c) => ({ ...c, items: itemsByCategory[c.id] || [] }))
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  const db = await getDB()
  const body = await req.json()
  const { name, venue_id } = body
  if (!name || !venue_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  try {
    const existing = await db
      .prepare('SELECT position FROM categories WHERE venue_id = ? ORDER BY position DESC LIMIT 1')
      .bind(venue_id)
      .first()

    const position = existing ? existing.position + 1 : 0
    const id = crypto.randomUUID()

    await db
      .prepare('INSERT INTO categories (id, name, venue_id, position) VALUES (?, ?, ?, ?)')
      .bind(id, name.trim().toUpperCase(), venue_id, position)
      .run()

    const category = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()
    return NextResponse.json(category)
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
    await db.prepare('DELETE FROM items WHERE category_id = ?').bind(id).run()
    await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
