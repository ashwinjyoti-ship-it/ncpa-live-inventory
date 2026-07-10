import { getDB } from '@/lib/db'
import { NextResponse } from 'next/server'


export async function GET() {
  const db = await getDB()

  try {
    const { results } = await db.prepare('SELECT name, venue_id FROM categories').all()

    // Group by name, count distinct venues
    const nameMap = {}
    ;(results || []).forEach((c) => {
      if (!nameMap[c.name]) nameMap[c.name] = new Set()
      nameMap[c.name].add(c.venue_id)
    })

    const result = Object.entries(nameMap)
      .map(([name, venueSet]) => ({ name, venueCount: venueSet.size }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
