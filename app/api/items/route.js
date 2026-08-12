export const dynamic = 'force-dynamic'

import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const venue_id = searchParams.get('venue_id')
    const q = searchParams.get('q')

    let rows
    if (venue_id && q) {
      rows = await sql`
        SELECT i.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'venue_id', c.venue_id,
            'position', c.position
          ) AS categories
        FROM items i
        JOIN categories c ON c.id = i.category_id
        WHERE c.venue_id = ${venue_id}
          AND i.name ILIKE ${'%' + q + '%'}
        ORDER BY c.position, i.name
      `
    } else if (venue_id) {
      rows = await sql`
        SELECT i.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'venue_id', c.venue_id,
            'position', c.position
          ) AS categories
        FROM items i
        JOIN categories c ON c.id = i.category_id
        WHERE c.venue_id = ${venue_id}
        ORDER BY c.position, i.name
      `
    } else if (q) {
      rows = await sql`
        SELECT i.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'venue_id', c.venue_id,
            'position', c.position
          ) AS categories
        FROM items i
        JOIN categories c ON c.id = i.category_id
        WHERE i.name ILIKE ${'%' + q + '%'}
        ORDER BY c.position, i.name
      `
    } else {
      rows = await sql`
        SELECT i.*,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'venue_id', c.venue_id,
            'position', c.position
          ) AS categories
        FROM items i
        JOIN categories c ON c.id = i.category_id
        ORDER BY c.position, i.name
      `
    }

    return NextResponse.json(rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, qty, category_id } = body
    if (!name || !category_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO items (name, qty, category_id)
      VALUES (${name.trim().toUpperCase()}, ${qty || 0}, ${category_id})
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, name, qty } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    let rows
    if (name !== undefined && qty !== undefined) {
      rows = await sql`
        UPDATE items
        SET name = ${name.trim().toUpperCase()}, qty = ${qty}, updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `
    } else if (name !== undefined) {
      rows = await sql`
        UPDATE items
        SET name = ${name.trim().toUpperCase()}, updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `
    } else if (qty !== undefined) {
      rows = await sql`
        UPDATE items
        SET qty = ${qty}, updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `
    } else {
      rows = await sql`SELECT * FROM items WHERE id = ${id}`
    }

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

    await sql`DELETE FROM items WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
