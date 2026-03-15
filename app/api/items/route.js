import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const venue_id = searchParams.get('venue_id')
  const q = searchParams.get('q')

  let query = supabase
    .from('items')
    .select('*, categories(id, name, venue_id, position)')
    .order('position', { foreignTable: 'categories' })
    .order('name')

  if (venue_id) {
    query = query.eq('categories.venue_id', venue_id)
  }
  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  const body = await req.json()
  const { name, qty, category_id } = body
  if (!name || !category_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('items')
    .insert({ name: name.trim().toUpperCase(), qty: qty || 0, category_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req) {
  const body = await req.json()
  const { id, name, qty } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const updates = {}
  if (name !== undefined) updates.name = name.trim().toUpperCase()
  if (qty !== undefined) updates.qty = qty

  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
