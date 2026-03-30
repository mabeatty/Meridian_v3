import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { HealthClient } from './HealthClient'

export default async function HealthPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [metricsRes, profileRes, workoutsRes, progressRes, assessmentRes, bodyCompRes] = await Promise.all([
    supabase.from('health_metrics').select('*').eq('user_id', user!.id)
      .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('metric_date', { ascending: false }),
    supabase.from('profiles').select('display_name').eq('id', user!.id).single(),
    supabase.from('workout_plans').select('*, workout_exercises(*)')
      .eq('user_id', user!.id).order('scheduled_date', { ascending: true }),
    supabase.from('workout_plans').select('*, workout_exercises(*)')
      .eq('user_id', user!.id).eq('status', 'completed')
      .order('scheduled_date', { ascending: false }).limit(50),
    supabase.from('monthly_assessments').select('*').eq('user_id', user!.id)
      .order('assessment_month', { ascending: false }).limit(1).single(),
    supabase.from('body_measurements').select('*').eq('user_id', user!.id)
      .order('measured_date', { ascending: false }).limit(12),
  ])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header displayName={profileRes.data?.display_name} />
      <div className="flex-1 overflow-y-auto p-6">
        <HealthClient
          metrics={metricsRes.data ?? []}
          allWorkouts={workoutsRes.data ?? []}
          completedWorkouts={progressRes.data ?? []}
          latestAssessment={assessmentRes.data ?? null}
          bodyComp={bodyCompRes.data ?? []}
        />
      </div>
    </div>
  )
}