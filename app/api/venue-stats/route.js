import { getDB } from '@/lib/db'
import { NextResponse } from 'next/server'


export async function GET() {
  const db = await getDB()

  try {
    const { results: venues } = await db.prepare('SELECT id, name FROM venues ORDER BY name').all()

    const { results: rows } = await db
      .prepare(
        `SELECT
           categories.venue_id AS venue_id,
           COUNT(DISTINCT categories.id) AS category_count,
           COUNT(items.id) AS item_count,
           COALESCE(SUM(items.qty), 0) AS total_qty
         FROM categories
         LEFT JOIN items ON items.category_id = categories.id
         GROUP BY categories.venue_id`
      )
      .all()

    const stats = {}
    ;(venues || []).forEach((v) => {
      stats[v.id] = { id: v.id, name: v.name, categoryCount: 0, itemCount: 0, totalQty: 0 }
    })
    ;(rows || []).forEach((r) => {
      if (stats[r.venue_id]) {
        stats[r.venue_id].categoryCount = r.category_count
        stats[r.venue_id].itemCount = r.item_count
        stats[r.venue_id].totalQty = r.total_qty
      }
    })

    return NextResponse.json(Object.values(stats))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
