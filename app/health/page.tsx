import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { HealthClient } from './HealthClient'

export default async function HealthPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: metrics } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', user!.id)
    .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('metric_date', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user!.id)
    .single()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header displayName={profile?.display_name} />
      <div className="flex-1 overflow-y-auto p-6">
        <HealthClient metrics={metrics ?? []} />
      </div>
    </div>
  )
}
