import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const [{ data: venues }, { data: cats }, { data: items }] = await Promise.all([
    supabase.from('venues').select('id, name').order('name'),
    supabase.from('categories').select('id, venue_id'),
    supabase.from('items').select('qty, category_id, categories(venue_id)'),
  ])

  const stats = {}
  venues?.forEach(v => {
    stats[v.id] = { id: v.id, name: v.name, categoryCount: 0, itemCount: 0, totalQty: 0 }
  })

  cats?.forEach(c => {
    if (stats[c.venue_id]) stats[c.venue_id].categoryCount++
  })

  items?.forEach(item => {
    const venueId = item.categories?.venue_id
    if (venueId && stats[venueId]) {
      stats[venueId].itemCount++
      stats[venueId].totalQty += item.qty
    }
  })

  return NextResponse.json(Object.values(stats))
}
