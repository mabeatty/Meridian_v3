import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = new URL(req.url).searchParams.get('week_start')
  if (!weekStart) return NextResponse.json({ error: 'Missing week_start' }, { status: 400 })

  const { data } = await supabase
    .from('fitness_conversations')
    .select('messages')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  return NextResponse.json({ messages: data?.messages ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, week_start, history, current_workouts } = await req.json()

  const [healthRes, workoutHistoryRes, bodyCompRes, goalsRes] = await Promise.all([
    supabase.from('health_metrics').select('*').eq('user_id', user.id)
      .order('metric_date', { ascending: false }).limit(14),
    supabase.from('workout_plans').select('*, workout_exercises(*)')
      .eq('user_id', user.id).eq('status', 'completed')
      .order('scheduled_date', { ascending: false }).limit(20),
    supabase.from('body_measurements').select('*').eq('user_id', user.id)
      .order('measured_date', { ascending: false }).limit(8),
    supabase.from('goals').select('*').eq('user_id', user.id)
      .eq('status', 'active').limit(5),
  ])

  const health = healthRes.data ?? []
  const workoutHistory = workoutHistoryRes.data ?? []
  const bodyComp = bodyCompRes.data ?? []
  const goals = goalsRes.data ?? []
  const latestHealth = health[0]
  const avg7HRV = health.slice(0, 7).reduce((s: number, h: any) => s + (h.hrv ?? 0), 0) / Math.min(7, health.length || 1)
  const avg7Recovery = health.slice(0, 7).reduce((s: number, h: any) => s + (h.recovery_score ?? 0), 0) / Math.min(7, health.length || 1)

  const exerciseHistory: Record<string, any[]> = {}
  for (const workout of workoutHistory) {
    for (const ex of workout.workout_exercises ?? []) {
      if (!exerciseHistory[ex.exercise_name]) exerciseHistory[ex.exercise_name] = []
      exerciseHistory[ex.exercise_name].push({ date: workout.scheduled_date, sets: ex.sets })
    }
  }

  const keyLifts = ['Squat', 'Bench Press', 'Overhead Press', 'Row', 'Incline Bench', 'Bulgarian Split Squat']
  const overloadContext = keyLifts
    .filter(lift => exerciseHistory[lift]?.length)
    .map(lift => {
      const sessions = exerciseHistory[lift].slice(0, 3)
      return `${lift}: ${sessions.map((s: any) => `${s.date}: ${JSON.stringify(s.sets)}`).join(' | ')}`
    }).join('\n')

  const systemPrompt = `You are an expert strength and conditioning coach. You have full context about this athlete and help them plan, optimize, and track their training.

CURRENT WHOOP DATA:
- Recovery: ${latestHealth?.recovery_score ?? 'unknown'} (7-day avg: ${Math.round(avg7Recovery)})
- HRV: ${latestHealth?.hrv ? Math.round(latestHealth.hrv) : 'unknown'}ms (7-day avg: ${Math.round(avg7HRV)}ms)
- Sleep: ${latestHealth?.sleep_hours ? latestHealth.sleep_hours.toFixed(1) : 'unknown'} hrs
- Strain: ${latestHealth?.strain ?? 'unknown'}
- Date: ${latestHealth?.metric_date ?? 'unknown'}

BODY COMPOSITION:
${bodyComp.length ? bodyComp.slice(0, 4).map((b: any) => `${b.measured_date}: ${b.weight_lbs}lbs, ${b.body_fat_pct}% body fat`).join('\n') : 'No body comp data yet'}

ACTIVE GOALS:
${goals.length ? goals.map((g: any) => `- ${g.title}: ${g.progress ?? 0}% complete`).join('\n') : 'No active goals'}

RECENT WORKOUT HISTORY:
${workoutHistory.length ? workoutHistory.map((w: any) => `${w.scheduled_date}: ${w.name} (${w.workout_type}, ${w.duration_minutes ?? '?'} min)`).join('\n') : 'No workout history yet'}

PROGRESSIVE OVERLOAD DATA:
${overloadContext || 'No strength history yet — ask the user about their current lifting numbers to establish a baseline'}

THIS WEEK PLANNED:
${current_workouts?.length ? current_workouts.map((w: any) => `${w.scheduled_date}: ${w.name} (${w.status})`).join('\n') : 'Nothing planned yet'}

WEEK: ${week_start}

TRAINING PROFILE:
- Primary: Strength training (squat, bench, OHP, rows, Bulgarian split squats, cables, dumbbells)
- Secondary: Running, cycling, walking, tennis, yoga
- Cardio tracked via Whoop. Strength logged manually.

When generating a workout, return it wrapped in <workout> tags as valid JSON:
<workout>
{
  "name": "Workout Name",
  "workout_type": "strength",
  "scheduled_date": "YYYY-MM-DD",
  "duration_minutes": 60,
  "notes": "Coach notes",
  "exercises": [
    {
      "exercise_name": "Bench Press",
      "sets": [
        {"set": 1, "reps": 8, "weight": 135, "notes": "warm up"},
        {"set": 2, "reps": 8, "weight": 185},
        {"set": 3, "reps": 8, "weight": 185}
      ],
      "superset_group": null,
      "notes": "Focus on controlled eccentric"
    }
  ]
}
</workout>

Recovery < 34 = deload or rest. Recovery 34-67 = moderate. Recovery > 67 = train hard. Be specific with weights based on history. If no history, ask about current working weights first.`

  try {
    const trimmedHistory = history.slice(-10)
    const messages = [
      ...trimmedHistory.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      }),
    })

    const aiData = await res.json()
    const responseText = aiData.content?.[0]?.text ?? ''

    const workoutMatch = responseText.match(/<workout>([\s\S]*?)<\/workout>/)
    let workout = null
    let cleanText = responseText

    if (workoutMatch) {
      try {
        workout = JSON.parse(workoutMatch[1].trim())
        cleanText = responseText.replace(/<workout>[\s\S]*?<\/workout>/, '').trim()
      } catch {
        workout = null
      }
    }

    const newHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: responseText },
    ]

    await supabase.from('fitness_conversations').upsert({
      user_id: user.id,
      week_start,
      messages: newHistory,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' })

    return NextResponse.json({ text: cleanText, workout })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}