import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 })

  // Fetch all categories matching the name, with their venue and items
  const { data: cats, error } = await supabase
    .from('categories')
    .select('id, name, venues(id, name), items(name, qty)')
    .eq('name', category)
    .order('name', { foreignTable: 'items' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build lookup: { venueName: { itemName: qty } }
  const venueItems = {}
  const venueTotals = {}
  const allItemsSet = new Set()

  cats?.forEach(cat => {
    const venueName = cat.venues?.name
    if (!venueName) return
    venueItems[venueName] = {}
    venueTotals[venueName] = 0
    cat.items?.forEach(item => {
      venueItems[venueName][item.name] = item.qty
      venueTotals[venueName] += item.qty
      allItemsSet.add(item.name)
    })
  })

  const allItems = [...allItemsSet].sort()

  return NextResponse.json({ venueItems, allItems, venueTotals })
}
