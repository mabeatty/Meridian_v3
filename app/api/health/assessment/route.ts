import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('monthly_assessments')
    .select('*')
    .eq('user_id', user.id)
    .order('assessment_month', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [healthRes, workoutsRes, bodyCompRes, nutritionRes, goalsRes, journalRes] = await Promise.all([
    supabase.from('health_metrics').select('*').eq('user_id', user.id)
      .order('metric_date', { ascending: false }).limit(30),
    supabase.from('workout_plans').select('*, workout_exercises(*)')
      .eq('user_id', user.id).eq('status', 'completed')
      .order('scheduled_date', { ascending: false }).limit(30),
    supabase.from('body_measurements').select('*').eq('user_id', user.id)
      .order('measured_date', { ascending: false }).limit(8),
    supabase.from('nutrition_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('goals').select('*').eq('user_id', user.id).limit(10),
    supabase.from('journal_entries').select('mood, energy, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
  ])

  const health = healthRes.data ?? []
  const workouts = workoutsRes.data ?? []
  const bodyComp = bodyCompRes.data ?? []
  const nutrition = nutritionRes.data
  const goals = goalsRes.data ?? []
  const journal = journalRes.data ?? []

  const avgRecovery = health.reduce((s: number, h: any) => s + (h.recovery_score ?? 0), 0) / (health.length || 1)
  const avgHRV = health.reduce((s: number, h: any) => s + (h.hrv ?? 0), 0) / (health.length || 1)
  const avgSleep = health.reduce((s: number, h: any) => s + (h.sleep_hours ?? 0), 0) / (health.length || 1)
  const avgStrain = health.reduce((s: number, h: any) => s + (h.strain ?? 0), 0) / (health.length || 1)
  const avgMood = journal.reduce((s: number, j: any) => s + (j.mood ?? 0), 0) / (journal.length || 1)
  const avgEnergy = journal.reduce((s: number, j: any) => s + (j.energy ?? 0), 0) / (journal.length || 1)

  const latestBodyComp = bodyComp[bodyComp.length - 1]
  const earliestBodyComp = bodyComp[0]
  const weightChange = latestBodyComp && earliestBodyComp ? latestBodyComp.weight_lbs - earliestBodyComp.weight_lbs : null
  const bodyFatChange = latestBodyComp && earliestBodyComp ? latestBodyComp.body_fat_pct - earliestBodyComp.body_fat_pct : null

  const exerciseVolume: Record<string, number> = {}
  for (const workout of workouts) {
    for (const ex of workout.workout_exercises ?? []) {
      exerciseVolume[ex.exercise_name] = (exerciseVolume[ex.exercise_name] ?? 0) + 1
    }
  }

  const prompt = `Generate a comprehensive monthly fitness and wellness assessment. Be specific, data-driven, and actionable. Write in second person.

HEALTH METRICS (last 30 days):
- Avg recovery: ${Math.round(avgRecovery)}/100
- Avg HRV: ${Math.round(avgHRV)}ms
- Avg sleep: ${avgSleep.toFixed(1)} hrs
- Avg strain: ${avgStrain.toFixed(1)}/21
- Data points: ${health.length} days

BODY COMPOSITION:
${bodyComp.length > 1
  ? `Latest: ${latestBodyComp?.weight_lbs}lbs, ${latestBodyComp?.body_fat_pct}% body fat
Earlier: ${earliestBodyComp?.weight_lbs}lbs, ${earliestBodyComp?.body_fat_pct}% body fat
Change: ${weightChange ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}lbs` : 'N/A'}, body fat ${bodyFatChange ? `${bodyFatChange > 0 ? '+' : ''}${bodyFatChange.toFixed(1)}%` : 'N/A'}`
  : 'Insufficient body comp data'}

TRAINING:
- Completed workouts: ${workouts.length} in last 30 days
- Most trained: ${Object.entries(exerciseVolume).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => `${name} (${count}x)`).join(', ')}

NUTRITION:
- Goal: ${nutrition?.goal ?? 'not set'}
- Target calories: ${nutrition?.target_calories ?? 'not set'}
- Target protein: ${nutrition?.target_protein ?? 'not set'}g

GOALS:
${goals.map((g: any) => `- ${g.title}: ${g.status} (${g.progress ?? 0}%)`).join('\n') || 'No goals set'}

MOOD & ENERGY:
- Avg mood: ${avgMood.toFixed(1)}/10
- Avg energy: ${avgEnergy.toFixed(1)}/10

Write 400-500 words covering: overall summary, recovery trends, training performance, body composition, nutrition alignment, mental wellness, top 3 wins, top 3 focus areas for next month.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const aiData = await res.json()
  const content = aiData.content?.[0]?.text ?? ''
  const now = new Date()
  const assessmentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('monthly_assessments')
    .upsert({
      user_id: user.id,
      assessment_month: assessmentMonth,
      content,
      health_summary: { avgRecovery, avgHRV, avgSleep, avgStrain, workoutCount: workouts.length },
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,assessment_month' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}