export const dynamic = 'force-dynamic'

import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const venue_id = searchParams.get('venue_id')

    const cats = venue_id
      ? await sql`
          SELECT * FROM categories
          WHERE venue_id = ${venue_id}
          ORDER BY position, name
        `
      : await sql`
          SELECT * FROM categories
          ORDER BY position, name
        `

    const catIds = cats.map((c) => c.id)
    const items = catIds.length
      ? await sql`
          SELECT id, name, qty, category_id
          FROM items
          WHERE category_id = ANY(${catIds})
          ORDER BY name
        `
      : []

    const byCat = {}
    for (const item of items) {
      if (!byCat[item.category_id]) byCat[item.category_id] = []
      byCat[item.category_id].push({
        id: item.id,
        name: item.name,
        qty: item.qty,
      })
    }

    const data = cats.map((c) => ({
      ...c,
      items: byCat[c.id] || [],
    }))

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, venue_id } = body
    if (!name || !venue_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const existing = await sql`
      SELECT position FROM categories
      WHERE venue_id = ${venue_id}
      ORDER BY position DESC
      LIMIT 1
    `
    const position = existing[0] ? existing[0].position + 1 : 0

    const rows = await sql`
      INSERT INTO categories (name, venue_id, position)
      VALUES (${name.trim().toUpperCase()}, ${venue_id}, ${position})
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await sql`DELETE FROM items WHERE category_id = ${id}`
    await sql`DELETE FROM categories WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
