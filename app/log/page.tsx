import { createClient } from '@/lib/supabase/server'
import { LogClient } from './LogClient'

export default async function LogPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const { data: todayWorkout } = await supabase
    .from('workout_plans')
    .select('*, workout_exercises(*)')
    .eq('user_id', user!.id)
    .eq('scheduled_date', today)
    .neq('status', 'skipped')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user!.id)
    .single()

  const { data: latestHealth } = await supabase
    .from('health_metrics')
    .select('recovery_score, hrv, strain, sleep_hours')
    .eq('user_id', user!.id)
    .order('metric_date', { ascending: false })
    .limit(1)
    .single()

  return (
    <LogClient
      workout={todayWorkout ?? null}
      displayName={profile?.display_name ?? 'Alex'}
      health={latestHealth ?? null}
    />
  )
}