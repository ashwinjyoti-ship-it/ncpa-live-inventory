import { getDB } from '@/lib/db'
import { NextResponse } from 'next/server'


export async function GET(req) {
  const db = await getDB()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 })

  try {
    // Fetch all categories matching the name, with their venue
    const { results: cats } = await db
      .prepare(
        `SELECT
           categories.id AS cat_id,
           categories.name AS cat_name,
           venues.id AS venue_id,
           venues.name AS venue_name
         FROM categories
         JOIN venues ON venues.id = categories.venue_id
         WHERE categories.name = ?`
      )
      .bind(category)
      .all()

    const catIds = (cats || []).map((c) => c.cat_id)
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

    // Build lookup: { venueName: { itemName: qty } }
    const venueItems = {}
    const venueTotals = {}
    const allItemsSet = new Set()

    ;(cats || []).forEach((cat) => {
      const venueName = cat.venue_name
      if (!venueName) return
      venueItems[venueName] = {}
      venueTotals[venueName] = 0
      ;(itemsByCategory[cat.cat_id] || []).forEach((item) => {
        venueItems[venueName][item.name] = item.qty
        venueTotals[venueName] += item.qty
        allItemsSet.add(item.name)
      })
    })

    const allItems = [...allItemsSet].sort()

    return NextResponse.json({ venueItems, allItems, venueTotals })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
