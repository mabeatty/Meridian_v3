import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const month = url.searchParams.get('month') // YYYY-MM
  const limit = parseInt(url.searchParams.get('limit') ?? '200')

  let query = supabase
    .from('transactions')
    .select('*, budget_categories(id, name, color)')
    .eq('user_id', user.id)
    .eq('pending', false)
    .order('date', { ascending: false })
    .limit(limit)

  if (month) {
    const start = `${month}-01`
    const end = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
      .toISOString().split('T')[0]
    query = query.gte('date', start).lte('date', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, category_id } = await req.json()

  const { data, error } = await supabase
    .from('transactions')
    .update({ category_id })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, budget_categories(id, name, color)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}