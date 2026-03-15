import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('categories')
    .select('name, venue_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by name, count distinct venues
  const nameMap = {}
  data?.forEach(c => {
    if (!nameMap[c.name]) nameMap[c.name] = new Set()
    nameMap[c.name].add(c.venue_id)
  })

  const result = Object.entries(nameMap)
    .map(([name, venueSet]) => ({ name, venueCount: venueSet.size }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json(result)
}
