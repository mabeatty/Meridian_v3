import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_CATEGORIES = [
  { name: 'Rental Expenses', color: '#f87171' },
  { name: 'Groceries', color: '#4ade80' },
  { name: 'Dining Out', color: '#fb923c' },
  { name: 'Transportation', color: '#60a5fa' },
  { name: 'Wellness', color: '#34d399' },
  { name: 'Healthcare', color: '#f472b6' },
  { name: 'Personal Care', color: '#a78bfa' },
  { name: 'Travel', color: '#38bdf8' },
  { name: 'Entertainment', color: '#fbbf24' },
  { name: 'Clothing', color: '#e879f9' },
  { name: 'Technology', color: '#818cf8' },
  { name: 'Subscriptions', color: '#94a3b8' },
  { name: 'Household Expenses', color: '#a3e635' },
  { name: 'Gifts & Donations', color: '#f43f5e' },
  { name: 'Education', color: '#2dd4bf' },
  { name: 'Life Fulfillment', color: '#c084fc' },
  { name: 'Miscellaneous', color: '#9ca3af' },
  { name: 'Transfer / Excluded', color: '#6b7280' },
]

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let { data } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  // Seed defaults if none exist
  if (!data?.length) {
    const { data: seeded } = await supabase
      .from('budget_categories')
      .insert(DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id, monthly_budget: 0 })))
      .select()
    data = seeded
  }

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, monthly_budget, color } = await req.json()

  const { data, error } = await supabase
    .from('budget_categories')
    .insert({ user_id: user.id, name, monthly_budget, color: color ?? '#60a5fa' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, monthly_budget, color } = await req.json()

  const { data, error } = await supabase
    .from('budget_categories')
    .update({ name, monthly_budget, color })
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
    .from('budget_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}