import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = new URL(req.url).searchParams.get('week_start')
  if (!weekStart) return NextResponse.json({ error: 'Missing week_start' }, { status: 400 })

  // Get or create meal plan for this week
  let { data: plan } = await supabase
    .from('meal_plans')
    .select('*, meal_plan_entries(*, recipes(*, recipe_ingredients(*)))')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  if (!plan) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const { data: newPlan } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        name: `Week of ${weekStart}`,
        week_start: weekStart,
        week_end: weekEnd.toISOString().split('T')[0],
      })
      .select('*, meal_plan_entries(*, recipes(*, recipe_ingredients(*)))')
      .single()
    plan = newPlan
  }

  return NextResponse.json({ data: plan })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meal_plan_id, recipe_id, day_of_week, meal_type, servings } = await req.json()

  const { data, error } = await supabase
    .from('meal_plan_entries')
    .insert({ meal_plan_id, recipe_id, day_of_week, meal_type, servings: servings ?? 1 })
    .select('*, recipes(*, recipe_ingredients(*))')
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
    .from('meal_plan_entries')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, servings } = await req.json()
  const { data, error } = await supabase
    .from('meal_plan_entries')
    .update({ servings })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}