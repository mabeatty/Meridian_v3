import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const weekStart = url.searchParams.get('week_start')
  const limit = url.searchParams.get('limit') ?? '20'

  let query = supabase
    .from('workout_plans')
    .select('*, workout_exercises(*)')
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true })

  if (weekStart) {
    const weekEnd = new Date(weekStart + 'T12:00:00')
    weekEnd.setDate(weekEnd.getDate() + 6)
    query = query
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd.toISOString().split('T')[0])
  } else {
    query = query.limit(parseInt(limit))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { exercises, ...workoutData } = await req.json()

  const { data: workout, error } = await supabase
    .from('workout_plans')
    .insert({ ...workoutData, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (exercises?.length) {
    await supabase.from('workout_exercises').insert(
      exercises.map((e: any, i: number) => ({
        ...e,
        workout_plan_id: workout.id,
        order_index: i,
      }))
    )
  }

  const { data: full } = await supabase
    .from('workout_plans')
    .select('*, workout_exercises(*)')
    .eq('id', workout.id)
    .single()

  return NextResponse.json({ data: full }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, exercises, ...updates } = await req.json()

  const { data, error } = await supabase
    .from('workout_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (exercises) {
    await supabase.from('workout_exercises').delete().eq('workout_plan_id', id)
    if (exercises.length) {
      await supabase.from('workout_exercises').insert(
        exercises.map((e: any, i: number) => ({
          ...e,
          workout_plan_id: id,
          order_index: i,
        }))
      )
    }
  }

  const { data: full } = await supabase
    .from('workout_plans')
    .select('*, workout_exercises(*)')
    .eq('id', id)
    .single()

  return NextResponse.json({ data: full })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('workout_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}