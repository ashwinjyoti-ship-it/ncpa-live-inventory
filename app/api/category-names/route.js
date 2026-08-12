export const dynamic = 'force-dynamic'

import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const rows = await sql`
      SELECT name, COUNT(DISTINCT venue_id)::int AS "venueCount"
      FROM categories
      GROUP BY name
      ORDER BY name
    `
    return NextResponse.json(rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
