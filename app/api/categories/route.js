import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const venue_id = searchParams.get('venue_id')

  let query = supabase
    .from('categories')
    .select('*, items(id, name, qty)')
    .order('position')
    .order('name', { foreignTable: 'items' })

  if (venue_id) query = query.eq('venue_id', venue_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  const body = await req.json()
  const { name, venue_id } = body
  if (!name || !venue_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: existing } = await supabase
    .from('categories')
    .select('position')
    .eq('venue_id', venue_id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = existing ? existing.position + 1 : 0

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim().toUpperCase(), venue_id, position })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await supabase.from('items').delete().eq('category_id', id)
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
