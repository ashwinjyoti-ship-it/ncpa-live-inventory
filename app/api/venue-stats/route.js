export const dynamic = 'force-dynamic'

import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        v.id,
        v.name,
        COUNT(DISTINCT c.id)::int AS "categoryCount",
        COUNT(i.id)::int AS "itemCount",
        COALESCE(SUM(i.qty), 0)::int AS "totalQty"
      FROM venues v
      LEFT JOIN categories c ON c.venue_id = v.id
      LEFT JOIN items i ON i.category_id = c.id
      GROUP BY v.id, v.name
      ORDER BY v.name
    `
    return NextResponse.json(rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
