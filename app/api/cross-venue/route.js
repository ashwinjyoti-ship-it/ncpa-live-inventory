export const dynamic = 'force-dynamic'

import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    if (!category) {
      return NextResponse.json({ error: 'category required' }, { status: 400 })
    }

    const cats = await sql`
      SELECT
        c.id,
        c.name,
        v.id AS venue_id,
        v.name AS venue_name
      FROM categories c
      JOIN venues v ON v.id = c.venue_id
      WHERE c.name = ${category}
    `

    const catIds = cats.map((c) => c.id)
    const items = catIds.length
      ? await sql`
          SELECT category_id, name, qty
          FROM items
          WHERE category_id = ANY(${catIds})
          ORDER BY name
        `
      : []

    const itemsByCat = {}
    for (const item of items) {
      if (!itemsByCat[item.category_id]) itemsByCat[item.category_id] = []
      itemsByCat[item.category_id].push(item)
    }

    const venueItems = {}
    const venueTotals = {}
    const allItemsSet = new Set()

    for (const cat of cats) {
      const venueName = cat.venue_name
      if (!venueName) continue
      venueItems[venueName] = {}
      venueTotals[venueName] = 0
      for (const item of itemsByCat[cat.id] || []) {
        venueItems[venueName][item.name] = item.qty
        venueTotals[venueName] += item.qty
        allItemsSet.add(item.name)
      }
    }

    const allItems = [...allItemsSet].sort()
    return NextResponse.json({ venueItems, allItems, venueTotals })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
