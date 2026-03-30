import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [workoutsRes, healthRes, bodyCompRes] = await Promise.all([
    supabase.from('workout_plans').select('*, workout_exercises(*)')
      .eq('user_id', user.id).eq('status', 'completed')
      .order('scheduled_date', { ascending: false }).limit(50),
    supabase.from('health_metrics')
      .select('metric_date, recovery_score, hrv, strain, sleep_hours')
      .eq('user_id', user.id)
      .order('metric_date', { ascending: false }).limit(30),
    supabase.from('body_measurements').select('*')
      .eq('user_id', user.id)
      .order('measured_date', { ascending: false }).limit(12),
  ])

  const workouts = workoutsRes.data ?? []
  const health = healthRes.data ?? []
  const bodyComp = bodyCompRes.data ?? []

  const exercisePRs: Record<string, { weight: number; reps: number; date: string }> = {}
  const exerciseHistory: Record<string, { date: string; maxWeight: number; totalVolume: number }[]> = {}

  for (const workout of workouts) {
    for (const ex of workout.workout_exercises ?? []) {
      const sets = ex.sets as any[]
      if (!sets?.length) continue
      const maxSet = sets.reduce((best: any, s: any) =>
        (s.weight ?? 0) > (best.weight ?? 0) ? s : best, sets[0])
      if (!exercisePRs[ex.exercise_name] || maxSet.weight > exercisePRs[ex.exercise_name].weight) {
        exercisePRs[ex.exercise_name] = { weight: maxSet.weight, reps: maxSet.reps, date: workout.scheduled_date }
      }
      const maxWeight = Math.max(...sets.map((s: any) => s.weight ?? 0))
      const totalVolume = sets.reduce((s: number, set: any) => s + ((set.weight ?? 0) * (set.reps ?? 0)), 0)
      if (!exerciseHistory[ex.exercise_name]) exerciseHistory[ex.exercise_name] = []
      exerciseHistory[ex.exercise_name].push({ date: workout.scheduled_date, maxWeight, totalVolume })
    }
  }

  return NextResponse.json({ exercisePRs, exerciseHistory, health, bodyComp, totalWorkouts: workouts.length })
}