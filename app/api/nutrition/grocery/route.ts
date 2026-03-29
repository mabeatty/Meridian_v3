import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = new URL(req.url).searchParams.get('week_start')
  if (!weekStart) return NextResponse.json({ error: 'Missing week_start' }, { status: 400 })

  const { data } = await supabase
    .from('grocery_list_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .order('category')

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { week_start, items } = await req.json()

  // Delete existing auto-generated items for this week
  await supabase
    .from('grocery_list_items')
    .delete()
    .eq('user_id', user.id)
    .eq('week_start', week_start)
    .eq('custom', false)

  // Insert new items
  if (items?.length) {
    await supabase.from('grocery_list_items').insert(
      items.map((item: any) => ({ ...item, user_id: user.id, week_start }))
    )
  }

  const { data } = await supabase
    .from('grocery_list_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', week_start)
    .order('category')

  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await req.json()
  const { data, error } = await supabase
    .from('grocery_list_items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('grocery_list_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}