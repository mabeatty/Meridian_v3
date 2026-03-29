import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*, meal_plan_entries(*, recipes(*))')
    .eq('user_id', user.id)
    .order('week_start', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, week_start, week_end, entries } = await req.json()

  const { data: plan, error } = await supabase
    .from('meal_plans')
    .insert({ user_id: user.id, name, week_start, week_end })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (entries?.length) {
    await supabase.from('meal_plan_entries').insert(
      entries.map((e: any) => ({ ...e, meal_plan_id: plan.id }))
    )
  }

  return NextResponse.json({ data: plan }, { status: 201 })
}